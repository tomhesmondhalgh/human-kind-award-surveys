
import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import StatsGrid from '../components/dashboard/StatsGrid';
import RecentSurveysList from '../components/dashboard/RecentSurveysList';
import GettingStartedGuide from '../components/dashboard/GettingStartedGuide';
import RoleDiagnostic from '../components/debug/RoleDiagnostic';
import { useDashboardData } from '@/hooks/useDashboardData';

const Dashboard = () => {
  const { user } = useAuth();
  const { stats, surveys, isLoading } = useDashboardData();

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back{user?.user_metadata?.first_name ? `, ${user.user_metadata.first_name}` : ''}!
          </h1>
          <p className="text-gray-600">Here's what's happening with your surveys today.</p>
        </div>

        {/* Temporary Role Diagnostic Tool */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-red-600">🔧 Role Diagnostic (Temporary)</h2>
          <RoleDiagnostic />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
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
          <div>
            <GettingStartedGuide />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
