import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Users, BarChart3, Lightbulb } from 'lucide-react';

const DashboardEmptyState = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      {/* Main Welcome Card */}
      <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-background">
        <CardContent className="pt-8 pb-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-card rounded-full shadow-md">
                <FileText className="h-16 w-16 text-primary" />
              </div>
            </div>
            <h2 className="text-3xl font-bold mb-4">
              Welcome to Staff Wellbeing Surveys
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              You haven't created any surveys yet. Let's get started by creating your first wellbeing survey 
              to understand how your staff are feeling.
            </p>
            <Button 
              onClick={() => navigate('/new-survey')}
              size="lg"
              className="text-lg px-8 py-6 h-auto"
            >
              <FileText className="mr-2 h-5 w-5" />
              Create Your First Survey
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Benefits Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6 pb-6">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full mb-4">
                <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Understand Your Team</h3>
              <p className="text-sm text-muted-foreground">
                Gather honest feedback about workload, work-life balance, and overall wellbeing
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 pb-6">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full mb-4">
                <BarChart3 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Track Progress</h3>
              <p className="text-sm text-muted-foreground">
                Monitor trends over time and see how wellbeing initiatives impact your team
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 pb-6">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full mb-4">
                <Lightbulb className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Take Action</h3>
              <p className="text-sm text-muted-foreground">
                Use insights to create targeted action plans and improve staff retention
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardEmptyState;
