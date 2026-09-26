
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../integrations/supabase/types';

/**
 * A utility wrapper to trace Supabase queries for debugging purposes
 * with enhanced detail for troubleshooting custom questions
 */
export function createTracingClient(client: SupabaseClient<Database>) {
  const originalFrom = client.from.bind(client);
  
  // Create a wrapper that will log all queries and responses
  const tracedClient = {
    ...client,
    from: (table: string) => {
      const queryBuilder = originalFrom(table);
      const originalSelect = queryBuilder.select.bind(queryBuilder);
      const originalIn = queryBuilder.in.bind(queryBuilder);
      const originalEq = queryBuilder.eq.bind(queryBuilder);
      
      // Override the select method to add tracing
      queryBuilder.select = function(...args: any[]) {
        const selectBuilder = originalSelect(...args);
        const originalThen = selectBuilder.then.bind(selectBuilder);
        
        console.log(`[QUERY TRACER] Table: ${table}, Select: ${args.join(', ') || '*'}`);
        
        // Store the query details for deeper analysis
        let queryDetails = {
          table,
          select: args.join(', ') || '*',
          filters: [],
          joins: args.toString().includes('(') ? 'Has joins/nested queries' : 'No joins'
        };
        
        // Capture the original execution chain and add logging
        selectBuilder.then = function(onfulfilled, onrejected) {
          return originalThen(
            (result) => {
              console.log(`[QUERY TRACER] Response for ${table}:`, {
                status: result.status,
                statusText: result.statusText,
                error: result.error,
                count: result.data ? result.data.length : 0,
              });
              
              if (result.error) {
                console.error(`[QUERY TRACER] Error details:`, result.error);
              }
              
              if (result.data && result.data.length > 0) {
                // Log some sample data to understand structure
                console.log(`[QUERY TRACER] Sample data (first item):`, result.data[0]);
                
                // Special handling for survey_questions and custom_questions tables
                if (table === 'survey_questions' || table === 'custom_questions') {
                  console.log(`[QUERY TRACER] Full data for ${table}:`, result.data);
                  
                  // Additional inspection for nested data in joins
                  if (table === 'survey_questions' && args.toString().includes('custom_questions')) {
                    console.log(`[QUERY TRACER] Inspecting join results for custom_questions...`);
                    result.data.forEach((item, index) => {
                      console.log(`[QUERY TRACER] Join item #${index + 1}:`, {
                        survey_question_id: item.id,
                        question_id: item.question_id,
                        survey_id: item.survey_id,
                        custom_question: item.custom_questions || 'NULL',
                        has_custom_question: !!item.custom_questions
                      });
                    });
                  }
                }
              } else {
                console.warn(`[QUERY TRACER] No data returned for ${table} query`);
              }
              
              return onfulfilled ? onfulfilled(result) : result;
            },
            (err) => {
              console.error(`[QUERY TRACER] Error in ${table} query:`, err);
              return onrejected ? onrejected(err) : Promise.reject(err);
            }
          );
        };
        
        return selectBuilder;
      };
      
      // Override the in method to track filter criteria
      queryBuilder.in = function(column: string, values: any[]) {
        console.log(`[QUERY TRACER] Filter: ${table}.${column} IN (${values.join(', ')})`);
        return originalIn(column, values);
      };
      
      // Override the eq method to track filter criteria
      queryBuilder.eq = function(column: string, value: any) {
        console.log(`[QUERY TRACER] Filter: ${table}.${column} = ${value}`);
        return originalEq(column, value);
      };
      
      return queryBuilder;
    }
  };
  
  return tracedClient as SupabaseClient<Database>;
}
