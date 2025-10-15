import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import PageTitle from '../components/ui/PageTitle';
import SurveyList from '../components/surveys/SurveyList';
import Pagination from '../components/surveys/Pagination';
import { toast } from "sonner";
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useIsMobile } from '../hooks/use-mobile';
import { sendSurveyReminder } from '../utils/survey/sendReminder';
import { AlertCircle, Archive, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';

const SURVEYS_PER_PAGE = 10;

const SurveyListSkeleton = () => {
  return (
    <div className="space-y-4">
      {/* Desktop skeleton */}
      <div className="hidden md:block border rounded-lg overflow-hidden">
        <div className="bg-muted/50 p-4 border-b">
          <div className="grid grid-cols-12 gap-4">
            {['Survey', 'Date', 'Status', 'Responses', 'Actions'].map((header) => (
              <Skeleton key={header} className="h-4 w-24 col-span-2" />
            ))}
          </div>
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-4 border-b last:border-b-0">
            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-24 mt-1" />
              </div>
              <Skeleton className="h-4 w-24 col-span-2" />
              <Skeleton className="h-6 w-16 rounded-full col-span-2" />
              <Skeleton className="h-4 w-8 col-span-1" />
              <div className="col-span-4 flex gap-2 justify-end">
                <Skeleton className="h-9 w-20 rounded" />
                <Skeleton className="h-9 w-20 rounded" />
                <Skeleton className="h-9 w-16 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Mobile skeleton */}
      <div className="md:hidden space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-start">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full col-span-2" />
            </div>
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 flex-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Surveys = () => {
  const { user } = useAuth();
  const { currentOrganization, isLoading: orgLoading, error: orgError } = useOrganization();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [totalSurveys, setTotalSurveys] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [canCreateSurveys, setCanCreateSurveys] = useState(true);
  const [refreshFlag, setRefreshFlag] = useState(0);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    setCanCreateSurveys(!!user && !!currentOrganization);
  }, [user, currentOrganization]);

  useEffect(() => {
    const fetchSurveys = async () => {
      // Don't fetch if org context is still loading
      if (orgLoading) {
        console.log('Organization context still loading, waiting...');
        return;
      }

      if (!user || !currentOrganization) {
        console.log('No user or organization found, skipping survey fetch');
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching surveys for organization:', currentOrganization.id);
        setLoading(true);
        setFetchError(null);
        
        console.log(`Counting surveys (${showArchived ? 'including archived' : 'excluding archived'})`);
        let countQuery = supabase
          .from('survey_templates')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', currentOrganization.id);
        
        if (!showArchived) {
          countQuery = countQuery.neq('status', 'Archived');
        }
        
        const { count, error: countError } = await countQuery;
          
        if (countError) {
          console.error('Error counting surveys:', countError);
          throw countError;
        }
        
        console.log(`Found ${count || 0} total surveys`);
        setTotalSurveys(count || 0);
        
        const from = (currentPage - 1) * SURVEYS_PER_PAGE;
        const to = from + SURVEYS_PER_PAGE - 1;
        
        console.log(`Fetching surveys page ${currentPage} (range ${from}-${to})`);
        let surveysQuery = supabase
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
          .eq('organization_id', currentOrganization.id);
        
        if (!showArchived) {
          surveysQuery = surveysQuery.neq('status', 'Archived');
        }
        
        const { data: surveyTemplates, error } = await surveysQuery
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
            url: `${window.location.origin}/survey/${template.id}`,
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
        
        let errorMessage = 'Failed to load surveys';
        
        if (error.code === '42883') {
          console.error('Database function error: The application is trying to use a database function that does not exist');
          errorMessage = "Database configuration issue. Please contact support.";
        } else if (error.code && error.code.startsWith('PGRST')) {
          console.error('PostgREST error:', error);
          errorMessage = "API configuration issue. Please try again later.";
        } else if (error.message?.includes('infinite recursion') || error.message?.includes('recursion')) {
          errorMessage = "Database configuration issue detected - please contact support.";
        } else {
          errorMessage = `Failed to load surveys: ${error.message || 'Unknown error'}`;
        }
        
        setFetchError(errorMessage);
        toast.error("Failed to load surveys", {
          description: "Please try refreshing the page."
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSurveys();
  }, [user, currentOrganization, currentPage, refreshFlag, orgLoading, showArchived]);

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

  // Show loading state while organization context is loading
  if (orgLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 md:p-8">
            <div className="text-center py-12" aria-live="polite" aria-busy="true">
              <div className="animate-spin h-8 w-8 border-4 border-brandPurple-500 border-t-transparent rounded-full mx-auto" role="progressbar"></div>
              <p className="mt-4 text-gray-600">Loading organisation data...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (orgError) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 md:p-8">
            <div className="bg-red-50 border border-red-200 text-red-600 p-6 rounded-md">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <h2 className="text-lg font-semibold mb-2">Organisation Loading Error</h2>
                <p className="mb-4">{orgError}</p>
                {orgError.includes('Database configuration') && (
                  <p className="text-sm italic mb-4">This appears to be a system configuration issue. Please contact support if this persists.</p>
                )}
                <button 
                  className="text-sm font-medium underline"
                  onClick={() => window.location.reload()}
                >
                  Reload page
                </button>
              </div>
            </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!currentOrganization) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 md:p-8">
            <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-4">No Organisation Selected</h2>
            <p className="text-gray-600 mb-6">Please select an organisation to view surveys.</p>
            <Link 
              to="/team" 
              className="bg-brandPurple-500 hover:bg-brandPurple-600 text-white font-medium py-2 px-6 rounded-md transition-all duration-200 inline-block"
            >
              Manage Organisations
            </Link>
          </div>
        </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 md:p-8">
          <div className={`flex ${isMobile ? 'flex-col gap-4' : 'justify-between items-center'} mb-8`}>
          <PageTitle 
            title="Surveys" 
            subtitle={`Manage wellbeing surveys for ${currentOrganization.name}`}
            className={`mb-0 ${isMobile ? 'text-center' : 'text-left'}`}
          />
          {user && (
            <Link 
              to="/survey-editor"
              className={`btn-primary ${isMobile ? 'w-full text-center py-3' : ''}`}
              aria-label="Create new survey"
            >
              + New Survey
            </Link>
          )}
        </div>

        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowArchived(!showArchived);
              setCurrentPage(1);
            }}
            className="w-full sm:w-auto gap-2"
          >
            {showArchived ? (
              <>
                <EyeOff className="h-4 w-4" />
                Active Only
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                Show All
              </>
            )}
          </Button>
          {showArchived && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Archive className="h-4 w-4" />
              Showing all surveys
            </p>
          )}
        </div>

        {fetchError && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-md mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Survey Loading Error</p>
                <p className="text-sm mt-1">{fetchError}</p>
                <button 
                  className="mt-2 text-sm font-medium underline"
                  onClick={() => {
                    setFetchError(null);
                    setRefreshFlag(prev => prev + 1);
                  }}
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <SurveyListSkeleton />
        ) : (
          <>
            {surveys.length === 0 && !fetchError ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
                <h2 className="text-xl font-semibold mb-2">No surveys found</h2>
                <p className="text-gray-500 mb-6">You haven't created any surveys for this organisation yet.</p>
                <Link 
                  to="/survey-editor" 
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
      </div>
    </MainLayout>
  );
};

export default Surveys;
