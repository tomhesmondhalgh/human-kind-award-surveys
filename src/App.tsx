import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { TestingModeProvider } from './contexts/TestingModeContext';
import { Toaster } from 'sonner';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import StripeProvider from './components/stripe/StripeProvider';
import ErrorBoundary from './components/error/ErrorBoundary';

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
  console.log('App.tsx - Rendering App component');
  
  return (
    <ErrorBoundary>
      <Router>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TestingModeProvider>
              <StripeProvider>
                <OrganizationProvider>
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
                  <Toaster position="bottom-right" />
                </OrganizationProvider>
              </StripeProvider>
            </TestingModeProvider>
          </AuthProvider>
        </QueryClientProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
