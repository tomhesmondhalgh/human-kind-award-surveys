
import { supabase } from '@/integrations/supabase/client';
import { SurveyTemplate, SurveyStatus } from '@/utils/types/survey';

interface QueryPerformanceMetrics {
  executionTime: number;
  rowsReturned: number;
  cacheHit: boolean;
}

// Simple cache for frequent queries
const queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

const CACHE_TTL = {
  SHORT: 30 * 1000,    // 30 seconds
  MEDIUM: 300 * 1000,  // 5 minutes
  LONG: 900 * 1000     // 15 minutes
};

/**
 * Generic cache helper
 */
function getCachedData<T>(key: string): T | null {
  const cached = queryCache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data as T;
  }
  queryCache.delete(key);
  return null;
}

function setCachedData<T>(key: string, data: T, ttl: number): void {
  queryCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
}

/**
 * Optimized survey templates query with organization filtering
 */
export async function getSurveyTemplatesOptimized(
  organizationId: string,
  status?: SurveyStatus,
  limit?: number
): Promise<SurveyTemplate[]> {
  const cacheKey = `surveys_${organizationId}_${status || 'all'}_${limit || 'unlimited'}`;
  
  // Check cache first
  const cached = getCachedData<SurveyTemplate[]>(cacheKey);
  if (cached) {
    console.log('Cache hit for survey templates');
    return cached;
  }

  try {
    console.log('Fetching survey templates from database');
    
    let query = supabase
      .from('survey_templates')
      .select(`
        id,
        name,
        date,
        close_date,
        organization_id,
        emails,
        status,
        created_at,
        updated_at
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching survey templates:', error);
      throw error;
    }

    const templates = data as SurveyTemplate[];
    
    // Cache successful results
    setCachedData(cacheKey, templates, CACHE_TTL.MEDIUM);
    
    console.log(`Fetched ${templates.length} survey templates`);
    return templates;

  } catch (error) {
    console.error('Error in getSurveyTemplatesOptimized:', error);
    return [];
  }
}

/**
 * Optimized survey response count
 */
export async function getSurveyResponseCountOptimized(surveyId: string): Promise<number> {
  const cacheKey = `responses_count_${surveyId}`;
  
  const cached = getCachedData<number>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    const { count, error } = await supabase
      .from('survey_responses')
      .select('*', { count: 'exact', head: true })
      .eq('survey_template_id', surveyId);

    if (error) {
      console.error('Error counting responses:', error);
      return 0;
    }

    const responseCount = count || 0;
    setCachedData(cacheKey, responseCount, CACHE_TTL.SHORT);
    
    return responseCount;
  } catch (error) {
    console.error('Error in getSurveyResponseCountOptimized:', error);
    return 0;
  }
}

/**
 * Clear cache for specific organization
 */
export function clearOrganizationCache(organizationId: string): void {
  const keysToDelete = Array.from(queryCache.keys()).filter(key => 
    key.includes(organizationId)
  );
  
  keysToDelete.forEach(key => queryCache.delete(key));
  console.log(`Cleared ${keysToDelete.length} cache entries for organization ${organizationId}`);
}

/**
 * Clear all cache
 */
export function clearAllCache(): void {
  queryCache.clear();
  console.log('Cleared all query cache');
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const now = Date.now();
  const stats = {
    totalEntries: queryCache.size,
    activeEntries: 0,
    expiredEntries: 0
  };

  queryCache.forEach((value) => {
    if (now - value.timestamp < value.ttl) {
      stats.activeEntries++;
    } else {
      stats.expiredEntries++;
    }
  });

  return stats;
}
