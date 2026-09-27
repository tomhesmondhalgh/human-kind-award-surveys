
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { TestingModeProvider } from './contexts/TestingModeContext';
import { CustomQuestionsProvider } from './contexts/CustomQuestionsContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/error/ErrorBoundary';

// Pages are loaded on demand so that survey respondents and visitors to the
// login page don't download the admin, analysis and PDF code.
const Index = lazy(() => import('./pages/Index'));
const Login = lazy(() => import('./pages/Login'));
const SignUp = lazy(() => import('./pages/SignUp'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Surveys = lazy(() => import('./pages/Surveys'));
const Team = lazy(() => import('./pages/Team'));
const Analysis = lazy(() => import('./pages/Analysis'));
const Improve = lazy(() => import('./pages/Improve'));
const Profile = lazy(() => import('./pages/Profile'));
const Admin = lazy(() => import('./pages/Admin'));
const PublicSurveyForm = lazy(() => import('./pages/PublicSurveyForm'));
const SurveyComplete = lazy(() => import('./pages/SurveyComplete'));
const SurveyClosed = lazy(() => import('./pages/SurveyClosed'));
const EmailConfirmation = lazy(() => import('./pages/EmailConfirmation'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const SurveyEditor = lazy(() => import('./pages/SurveyEditor'));
const Purchases = lazy(() => import('./pages/Purchases'));
const CustomQuestions = lazy(() => import('./pages/CustomQuestions'));
const Upgrade = lazy(() => import('./pages/Upgrade'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Accredit = lazy(() => import('./pages/Accredit'));
const AcceptInvitation = lazy(() => import('./pages/AcceptInvitation'));

const PageLoader = () => (
  <div className="flex justify-center items-center h-screen" role="status" aria-label="Loading">
    <div className="animate-spin h-8 w-8 border-4 border-brandPurple-500 border-t-transparent rounded-full" />
  </div>
);

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
                  <Router>
                    <div className="App">
                      <Suspense fallback={<PageLoader />}>
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
                            <Route path="/new-survey" element={<Navigate to="/survey-editor" replace />} />
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
                      </Suspense>
                      <Toaster position="top-right" />
                    </div>
                  </Router>
              </CustomQuestionsProvider>
            </TestingModeProvider>
          </OrganizationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
