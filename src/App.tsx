
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Surveys from './pages/Surveys';
import Settings from './pages/Settings';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ResetPassword from './pages/ResetPassword';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { CustomQuestionsProvider } from './contexts/CustomQuestionsContext';
import { TestingModeProvider } from './contexts/TestingModeContext';
import { StripeProvider } from './contexts/StripeContext';
import { Toaster } from '@/components/ui/sonner';
import AuthErrorBoundary from './components/error/AuthErrorBoundary';

// Import additional pages that need to be in the protected routes
import Admin from './pages/Admin';
import Team from './pages/Team';
import Profile from './pages/Profile';
import Analysis from './pages/Analysis';
import ActionPlan from './pages/ActionPlan';
import Improve from './pages/Improve';
import Accredit from './pages/Accredit';
import Upgrade from './pages/Upgrade';
import Purchases from './pages/Purchases';
import CustomQuestions from './pages/CustomQuestions';
import EmailConfirmation from './pages/EmailConfirmation';
import PaymentSuccess from './pages/PaymentSuccess';
import SurveyEditor from './pages/SurveyEditor';
import Index from './pages/Index';

// Import public pages that don't use MainLayout
import PublicSurveyForm from './pages/PublicSurveyForm';
import SurveyForm from './pages/SurveyForm';
import SurveyComplete from './pages/SurveyComplete';
import SurveyClosed from './pages/SurveyClosed';
import AcceptInvitation from './pages/AcceptInvitation';

// Create a QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <Router>
      <QueryClientProvider client={queryClient}>
        <AuthErrorBoundary enableRecovery={true}>
          <AuthProvider>
            <OrganizationProvider>
              <CustomQuestionsProvider>
                <TestingModeProvider>
                  <StripeProvider>
                    <div className="min-h-screen bg-gray-50">
                      <Routes>
                        {/* Standalone auth pages - no MainLayout */}
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<SignUp />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route path="/email-confirmation" element={<EmailConfirmation />} />
                        
                        {/* Public survey pages - no MainLayout */}
                        <Route path="/survey/:surveyId" element={<PublicSurveyForm />} />
                        <Route path="/survey-form/:surveyId" element={<SurveyForm />} />
                        <Route path="/survey-complete" element={<SurveyComplete />} />
                        <Route path="/survey-closed" element={<SurveyClosed />} />
                        <Route path="/accept-invitation" element={<AcceptInvitation />} />
                        
                        {/* Payment and upgrade pages - no MainLayout for standalone use */}
                        <Route path="/payment-success" element={<PaymentSuccess />} />
                        
                        {/* Protected routes using MainLayout with nested routing */}
                        <Route
                          path="/"
                          element={
                            <ProtectedRoute>
                              <MainLayout />
                            </ProtectedRoute>
                          }
                        >
                          <Route index element={<Index />} />
                          <Route path="dashboard" element={<Dashboard />} />
                          <Route path="surveys" element={<Surveys />} />
                          <Route path="surveys/new" element={<SurveyEditor />} />
                          <Route path="surveys/:id/edit" element={<SurveyEditor />} />
                          <Route path="settings" element={<Settings />} />
                          <Route path="admin" element={<Admin />} />
                          <Route path="team" element={<Team />} />
                          <Route path="profile" element={<Profile />} />
                          <Route path="analysis" element={<Analysis />} />
                          <Route path="action-plan" element={<ActionPlan />} />
                          <Route path="improve" element={<Improve />} />
                          <Route path="accredit" element={<Accredit />} />
                          <Route path="upgrade" element={<Upgrade />} />
                          <Route path="purchases" element={<Purchases />} />
                          <Route path="custom-questions" element={<CustomQuestions />} />
                        </Route>

                        <Route path="*" element={<NotFound />} />
                      </Routes>
                      <Toaster />
                    </div>
                  </StripeProvider>
                </TestingModeProvider>
              </CustomQuestionsProvider>
            </OrganizationProvider>
          </AuthProvider>
        </AuthErrorBoundary>
      </QueryClientProvider>
    </Router>
  );
}

export default App;
