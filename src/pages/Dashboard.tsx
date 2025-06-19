import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import StatsGrid from '../components/dashboard/StatsGrid';
import RecentSurveysList from '../components/dashboard/RecentSurveysList';
import GettingStartedGuide from '../components/dashboard/GettingStartedGuide';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { checkForClosedSurveys } from '../utils/survey/templates';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { currentOrganization, organizations, isLoading, error } = useOrganization();

  useEffect(() => {
    checkForClosedSurveys();
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    const isConnectionError = errorMessage.includes('fetch');
    
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {isConnectionError 
              ? 'Unable to connect to the server. Please check your internet connection and try again.'
              : errorMessage
            }
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>
            Welcome to your wellbeing dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <StatsGrid />
          <RecentSurveysList />
        </CardContent>
      </Card>
      <GettingStartedGuide />
    </div>
  );
};

export default Dashboard;
