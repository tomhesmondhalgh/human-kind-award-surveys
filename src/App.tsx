import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { TestingModeProvider } from './contexts/TestingModeContext';
import { Toaster } from 'sonner';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import StripeProvider from './components/stripe/StripeProvider';
import ErrorBoundary from './components/error/ErrorBoundary';
import CustomQuestionsProvider from './contexts/CustomQuestionsContext';
import CustomScriptsLoader from './components/CustomScriptsLoader';
import TestingModeIndicator from './components/TestingModeIndicator';
import ScreenOrientationOverlay from './components/ScreenOrientationOverlay';

// Page imports
import Index from './pages/Index';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import EmailConfirmation from './pages/EmailConfirmation';
import ResetPassword from './pages/ResetPassword';
import PublicSurveyForm from './pages/PublicSurveyForm';
import SurveyComplete from './pages/SurveyComplete';
import SurveyClosed from './pages/SurveyClosed';
import PaymentSuccess from './pages/PaymentSuccess';
import Dashboard from './pages/Dashboard';
import Surveys from './pages/Surveys';
import SurveyEditor from './pages/SurveyEditor';
import Analysis from './pages/Analysis';
import Upgrade from './pages/Upgrade';
import Improve from './pages/Improve';
import Accredit from './pages/Accredit';
import Profile from './pages/Profile';
import Purchases from './pages/Purchases';
import Admin from './pages/Admin';
import CustomQuestions from './pages/CustomQuestions';
import NotFound from './pages/NotFound';

console.log('App.tsx - Starting initialization');

// Create a new QueryClient instance
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
    <QueryClient client={queryClient}>
      <AuthProvider>
        <OrganizationProvider>
          <TestingModeProvider>
            <CustomQuestionsProvider>
              <StripeProvider>
                <Router>
                  <ErrorBoundary>
                    <div className="App">
                      <CustomScriptsLoader />
                      <TestingModeIndicator />
                      <ScreenOrientationOverlay />
                      <Routes>
                        {/* Public routes */}
                        <Route path="/" element={<Index />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<SignUp />} />
                        <Route path="/email-confirmation" element={<EmailConfirmation />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route path="/survey" element={<PublicSurveyForm />} />
                        <Route path="/survey-complete" element={<SurveyComplete />} />
                        <Route path="/survey-closed" element={<SurveyClosed />} />
                        <Route path="/payment-success" element={<PaymentSuccess />} />
                        
                        {/* Protected routes - all using the consolidated ProtectedRoute component */}
                        <Route path="/dashboard" element={
                          <ProtectedRoute>
                            <Dashboard />
                          </ProtectedRoute>
                        } />
                        <Route path="/surveys" element={
                          <ProtectedRoute>
                            <Surveys />
                          </ProtectedRoute>
                        } />
                        <Route path="/new-survey" element={
                          <ProtectedRoute>
                            <SurveyEditor />
                          </ProtectedRoute>
                        } />
                        <Route path="/surveys/:id/edit" element={
                          <ProtectedRoute>
                            <SurveyEditor />
                          </ProtectedRoute>
                        } />
                        <Route path="/analysis" element={
                          <ProtectedRoute>
                            <Analysis />
                          </ProtectedRoute>
                        } />
                        <Route path="/upgrade" element={
                          <ProtectedRoute>
                            <Upgrade />
                          </ProtectedRoute>
                        } />
                        <Route path="/improve" element={
                          <ProtectedRoute>
                            <Improve />
                          </ProtectedRoute>
                        } />
                        <Route path="/accredit" element={
                          <ProtectedRoute>
                            <Accredit />
                          </ProtectedRoute>
                        } />
                        <Route path="/profile" element={
                          <ProtectedRoute>
                            <Profile />
                          </ProtectedRoute>
                        } />
                        <Route path="/purchases" element={
                          <ProtectedRoute>
                            <Purchases />
                          </ProtectedRoute>
                        } />
                        <Route path="/admin" element={
                          <ProtectedRoute>
                            <Admin />
                          </ProtectedRoute>
                        } />
                        <Route path="/custom-questions" element={
                          <ProtectedRoute>
                            <CustomQuestions />
                          </ProtectedRoute>
                        } />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                      <Toaster />
                    </div>
                  </ErrorBoundary>
                </Router>
              </StripeProvider>
            </CustomQuestionsProvider>
          </TestingModeProvider>
        </OrganizationProvider>
      </AuthProvider>
    </QueryClient>
  );
}

export default App;
