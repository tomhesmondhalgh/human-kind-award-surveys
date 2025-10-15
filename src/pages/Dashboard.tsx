import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import PageContainer from '../components/layout/PageContainer';
import PageTitle from '../components/ui/PageTitle';
import { useAuth } from '../contexts/AuthContext';
import StatsGrid from '../components/dashboard/StatsGrid';
import RecentSurveysList from '../components/dashboard/RecentSurveysList';
import GettingStartedGuide from '../components/dashboard/GettingStartedGuide';
import DashboardEmptyState from '../components/dashboard/DashboardEmptyState';
import { useDashboardData } from '../hooks/useDashboardData';

const Dashboard = () => {
  const { user } = useAuth();
  const { stats, surveys, isLoading, error, hasOrganization } = useDashboardData();

  return (
    <MainLayout>
      <PageContainer>
        <PageTitle 
          title={`Welcome back${user?.user_metadata?.first_name ? `, ${user.user_metadata.first_name}` : ''}!`}
          subtitle="Here's what's happening with your surveys today."
        />

        {/* Show error state if there's an error */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-red-800 font-medium">Error loading dashboard data</h3>
            <p className="text-red-600 text-sm mt-1">{error.message}</p>
          </div>
        )}

        {/* Show message if no organization */}
        {!hasOrganization && !isLoading && (
          <div className="mb-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-yellow-800 font-medium">No Organisation Found</h3>
            <p className="text-yellow-700 text-sm mt-1">
              Please contact support to set up your organisation or check your team membership.
            </p>
          </div>
        )}

        {!isLoading && stats.totalSurveys === 0 ? (
          <DashboardEmptyState />
        ) : (
          <div className="space-y-8">
            <GettingStartedGuide />
            
            <StatsGrid 
              totalSurveys={stats.totalSurveys}
              totalRespondents={stats.totalRespondents}
              responseRate={stats.responseRate}
              benchmarkScore={stats.benchmarkScore}
              isLoading={isLoading}
            />
            
            <RecentSurveysList 
              surveys={surveys}
              isLoading={isLoading}
            />
          </div>
        )}
      </PageContainer>
    </MainLayout>
  );
};

export default Dashboard;
