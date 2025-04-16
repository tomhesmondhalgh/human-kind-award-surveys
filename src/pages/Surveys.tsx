import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import PageTitle from '../components/ui/PageTitle';
import SurveyList from '../components/surveys/SurveyList';
import Pagination from '../components/surveys/Pagination';
import { toast } from "sonner";
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../hooks/use-mobile';
import { sendSurveyReminder } from '../utils/survey/sendReminder';

const SURVEYS_PER_PAGE = 10;

const Surveys = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [totalSurveys, setTotalSurveys] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [canCreateSurveys, setCanCreateSurveys] = useState(true);
  const [refreshFlag, setRefreshFlag] = useState(0);
  const isMobile = useIsMobile();

  useEffect(() => {
    setCanCreateSurveys(!!user);
  }, [user]);

  useEffect(() => {
    const fetchSurveys = async () => {
      if (!user) {
        console.log('No user found, skipping survey fetch');
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching surveys for user:', user.id);
        setLoading(true);
        
        console.log('Counting surveys excluding Archived ones');
        const { count, error: countError } = await supabase
          .from('survey_templates')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', user.id)
          .neq('status', 'Archived');
          
        if (countError) {
          console.error('Error counting surveys:', countError);
          throw countError;
        }
        
        console.log(`Found ${count || 0} total surveys`);
        setTotalSurveys(count || 0);
        
        const from = (currentPage - 1) * SURVEYS_PER_PAGE;
        const to = from + SURVEYS_PER_PAGE - 1;
        
        console.log(`Fetching surveys page ${currentPage} (range ${from}-${to})`);
        const { data: surveyTemplates, error } = await supabase
          .from('survey_templates')
          .select(`
            id,
            name,
            date,
            close_date,
            created_at,
            emails,
            status,
            survey_responses(count)
          `)
          .eq('creator_id', user.id)
          .neq('status', 'Archived')
          .order('created_at', { ascending: false })
          .range(from, to);
          
        if (error) {
          console.error('Error fetching survey data:', error);
          throw error;
        }
        
        console.log('Successfully fetched surveys:', surveyTemplates.length);
        console.log('Survey data sample:', surveyTemplates.length > 0 ? surveyTemplates[0] : 'No surveys found');
        
        const formattedSurveys = surveyTemplates.map(template => {
          const now = new Date();
          const surveyDate = new Date(template.date);
          const closeDate = template.close_date ? new Date(template.close_date) : null;
          
          let status: 'Scheduled' | 'Sent' | 'Completed' = 'Scheduled';
          if (template.status) {
            status = template.status as any;
          } else if (surveyDate <= now) {
            status = closeDate && closeDate < now ? 'Completed' : 'Sent';
          }
          
          return {
            id: template.id,
            name: template.name,
            date: new Date(template.date).toLocaleDateString('en-GB', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }),
            status,
            responseCount: template.survey_responses.length > 0 ? template.survey_responses[0].count : 0,
            closeDate: template.close_date ? new Date(template.close_date).toLocaleDateString('en-GB', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }) : undefined,
            url: `${window.location.origin}/survey?id=${template.id}`,
            formattedDate: new Date(template.date).toLocaleDateString('en-GB', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            }),
            closeDisplayDate: template.close_date ? 
              `Closes: ${new Date(template.close_date).toLocaleDateString('en-GB', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}` : 
              undefined,
            emails: template.emails || ''
          };
        });
        
        console.log('Surveys formatted successfully');
        setSurveys(formattedSurveys);
      } catch (error: any) {
        console.error('Error fetching surveys:', error);
        
        if (error.code === '42883') {
          console.error('Database function error: The application is trying to use a database function that does not exist');
          toast.error("Failed to load surveys", {
            description: "Database configuration issue. Please contact support."
          });
        } else if (error.code && error.code.startsWith('PGRST')) {
          console.error('PostgREST error:', error);
          toast.error("Failed to load surveys", {
            description: "API configuration issue. Please try again later."
          });
        } else {
          toast.error("Failed to load surveys", {
            description: "Please try refreshing the page."
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSurveys();
  }, [user, currentPage, refreshFlag]);

  const handleSendReminder = async (id: string) => {
    console.log(`Sending reminder for survey ${id}`);
    
    const success = await sendSurveyReminder(id);
    
    if (success) {
      toast.success("Reminder sent successfully!", {
        description: "Your staff will receive an email reminder shortly."
      });
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };
  
  const refreshSurveys = () => {
    setRefreshFlag(prev => prev + 1);
  };

  const totalPages = Math.ceil(totalSurveys / SURVEYS_PER_PAGE);

  return (
    <MainLayout>
      <div className="page-container bg-white">
        <div className={`flex ${isMobile ? 'flex-col gap-4' : 'justify-between items-center'} mb-8`}>
          <PageTitle 
            title="Surveys" 
            subtitle="Manage all your wellbeing surveys in one place"
            className={`mb-0 ${isMobile ? 'text-center' : 'text-left'}`}
          />
          {user && (
            <Link 
              to="/new-survey"
              className={`btn-primary ${isMobile ? 'w-full text-center py-3' : ''}`}
              aria-label="Create new survey"
            >
              + New Survey
            </Link>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12" aria-live="polite" aria-busy="true">
            <div className="animate-spin h-8 w-8 border-4 border-brandPurple-500 border-t-transparent rounded-full mx-auto" role="progressbar"></div>
            <p className="mt-4 text-gray-600">Loading surveys...</p>
          </div>
        ) : (
          <>
            {surveys.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
                <h2 className="text-xl font-semibold mb-2">No surveys found</h2>
                <p className="text-gray-500 mb-6">You haven't created any surveys yet.</p>
                <Link 
                  to="/new-survey" 
                  className="bg-brandPurple-500 hover:bg-brandPurple-600 text-white font-medium py-2 px-6 rounded-md transition-all duration-200 inline-block"
                  aria-label="Create your first survey"
                >
                  Create Your First Survey
                </Link>
              </div>
            ) : (
              <>
                <div aria-live="polite">
                  <SurveyList 
                    surveys={surveys} 
                    onSendReminder={handleSendReminder}
                    refreshList={refreshSurveys}
                  />
                </div>
                
                {totalPages > 1 && (
                  <div className="mt-8">
                    <Pagination 
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default Surveys;
