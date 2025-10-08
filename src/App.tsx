
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { TestingModeProvider } from './contexts/TestingModeContext';
import { CustomQuestionsProvider } from './contexts/CustomQuestionsContext';
import StripeProvider from './components/stripe/StripeProvider';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/error/ErrorBoundary';
import CustomScriptsLoader from './components/layout/CustomScriptsLoader';

// Page imports
import Index from './pages/Index';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import Surveys from './pages/Surveys';
import Team from './pages/Team';
import Analysis from './pages/Analysis';
import Improve from './pages/Improve';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import PublicSurveyForm from './pages/PublicSurveyForm';
import SurveyComplete from './pages/SurveyComplete';
import SurveyClosed from './pages/SurveyClosed';
import EmailConfirmation from './pages/EmailConfirmation';
import ResetPassword from './pages/ResetPassword';
import PaymentSuccess from './pages/PaymentSuccess';
import SurveyEditor from './pages/SurveyEditor';
import Purchases from './pages/Purchases';
import CustomQuestions from './pages/CustomQuestions';
import Upgrade from './pages/Upgrade';
import NotFound from './pages/NotFound';
import Accredit from './pages/Accredit';
import AcceptInvitation from './pages/AcceptInvitation';

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <OrganizationProvider>
            <TestingModeProvider>
              <CustomQuestionsProvider>
                <StripeProvider>
                  <Router>
                    <div className="App">
                      <CustomScriptsLoader />
                      <Routes>
                        {/* Public routes */}
                        <Route path="/" element={<Index />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<SignUp />} />
                        <Route path="/email-confirmation" element={<EmailConfirmation />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route path="/survey/:id" element={<PublicSurveyForm />} />
                        <Route path="/survey-complete" element={<SurveyComplete />} />
                        <Route path="/survey-closed" element={<SurveyClosed />} />
                        <Route path="/accept-invitation" element={<AcceptInvitation />} />
                        
                        {/* Protected routes */}
                        <Route element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/surveys" element={<Surveys />} />
                          <Route path="/team" element={<Team />} />
                          <Route path="/analysis" element={<Analysis />} />
                          <Route path="/improve" element={<Improve />} />
                          <Route path="/profile" element={<Profile />} />
                          <Route path="/admin" element={<Admin />} />
                          <Route path="/survey-form/:id" element={<Navigate to={`/survey-editor`} replace />} />
                          <Route path="/payment-success" element={<PaymentSuccess />} />
                          <Route path="/survey-editor" element={<SurveyEditor />} />
                          <Route path="/survey-editor/:id" element={<SurveyEditor />} />
                          <Route path="/purchases" element={<Purchases />} />
                           <Route path="/custom-questions" element={<CustomQuestions />} />
                           <Route path="/upgrade" element={<Upgrade />} />
                           <Route path="/accredit" element={<Accredit />} />
                        </Route>
                        
                        {/* Fallback routes */}
                        <Route path="/404" element={<NotFound />} />
                        <Route path="*" element={<Navigate to="/404" replace />} />
                      </Routes>
                      <Toaster position="top-right" />
                    </div>
                  </Router>
                </StripeProvider>
              </CustomQuestionsProvider>
            </TestingModeProvider>
          </OrganizationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
