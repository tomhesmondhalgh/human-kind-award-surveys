
import React from 'react';
import { useTestingMode } from '@/contexts/TestingModeContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlanType } from '@/lib/supabase/subscription';
import { toast } from '@/hooks/use-toast';

const TestingMode = () => {
  const { 
    isTestingMode, 
    testingPlan,
    enableTestingMode,
    disableTestingMode
  } = useTestingMode();

  const handleSelectPlan = (plan: PlanType) => {
    // If we're selecting the current plan, do nothing
    if (isTestingMode && testingPlan === plan) {
      return;
    }
    
    enableTestingMode(plan);
    toast({
      title: 'Testing Mode Enabled',
      description: `Testing with ${plan} plan`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Testing Mode</h2>
        <p className="text-muted-foreground">
          Simulate different subscription plans for testing purposes
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Select a Subscription Plan</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(['free', 'foundation', 'progress', 'premium'] as PlanType[]).map((plan) => (
              <button
                key={plan}
                className={`p-4 border rounded-lg text-center capitalize transition-colors ${
                  isTestingMode && testingPlan === plan 
                    ? 'border-primary bg-primary/10 text-primary' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleSelectPlan(plan)}
              >
                {plan}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {isTestingMode && (
        <Card className="p-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-start space-x-4">
            <div className="bg-yellow-200 p-2 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-700">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-yellow-800">Testing Mode Active</h3>
              <p className="text-yellow-700 mt-1">
                You are currently viewing the application with a simulated subscription plan.
              </p>
              <div className="mt-2 space-y-1 text-sm">
                {testingPlan && (
                  <p className="text-yellow-800">
                    <span className="font-medium">Plan:</span> {testingPlan}
                  </p>
                )}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  disableTestingMode();
                  toast({
                    title: 'Testing Mode Disabled',
                    description: 'You are now using your actual subscription',
                  });
                }}
                className="mt-3 border-yellow-300 text-yellow-800 hover:bg-yellow-100"
              >
                Exit Testing Mode
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default TestingMode;
