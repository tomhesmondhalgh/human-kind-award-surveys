
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
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<SignUp />} />
                        <Route path="/reset-password" element={<ResetPassword />} />

                        <Route
                          path="/"
                          element={
                            <ProtectedRoute>
                              <MainLayout />
                            </ProtectedRoute>
                          }
                        >
                          <Route index element={<Dashboard />} />
                          <Route path="dashboard" element={<Dashboard />} />
                          <Route path="surveys" element={<Surveys />} />
                          <Route path="settings" element={<Settings />} />
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
