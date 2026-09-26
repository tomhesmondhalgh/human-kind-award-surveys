
import React, { createContext, useContext, useState } from 'react';
import { PlanType } from '../lib/supabase/subscription';
import { useAdminRole } from '../hooks/useAdminRole';

interface TestingModeContextType {
  isTestingMode: boolean;
  testingPlan: PlanType | null;
  enableTestingMode: (plan: PlanType) => void;
  disableTestingMode: () => void;
  setTestingPlan: (plan: PlanType | null) => void;
}

const TestingModeContext = createContext<TestingModeContextType | undefined>(undefined);

export function TestingModeProvider({ children }: { children: React.ReactNode }) {
  console.log('Initializing TestingModeProvider');
  
  // Session-only state (resets on page refresh for security)
  const [isTestingMode, setIsTestingMode] = useState<boolean>(false);
  const [testingPlan, setTestingPlan] = useState<PlanType | null>(null);

  const enableTestingMode = (plan: PlanType) => {
    console.log('Enabling testing mode with plan:', plan);
    setIsTestingMode(true);
    setTestingPlan(plan);
  };

  const disableTestingMode = () => {
    console.log('Disabling testing mode');
    setIsTestingMode(false);
    setTestingPlan(null);
  };

  const contextValue = {
    isTestingMode,
    testingPlan,
    enableTestingMode,
    disableTestingMode,
    setTestingPlan
  };

  console.log('TestingModeProvider current state:', contextValue);

  return (
    <TestingModeContext.Provider value={contextValue}>
      {children}
    </TestingModeContext.Provider>
  );
}

export function useTestingMode() {
  const context = useContext(TestingModeContext);
  if (context === undefined) {
    throw new Error('useTestingMode must be used within a TestingModeProvider');
  }
  return context;
}
