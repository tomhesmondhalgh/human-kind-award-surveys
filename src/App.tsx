import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { QueryClient } from 'react-query';

import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Surveys from './pages/Surveys';
import NewSurvey from './pages/NewSurvey';
import EditSurvey from './pages/EditSurvey';
import Responses from './pages/Responses';
import Settings from './pages/Settings';
import Billing from './pages/Billing';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Pricing from './pages/Pricing';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { CustomQuestionsProvider } from './contexts/CustomQuestionsContext';
import { TestingModeProvider } from './contexts/TestingModeContext';
import { StripeProvider } from './contexts/StripeContext';
import { Toaster } from '@/components/ui/sonner';
import AuthErrorBoundary from './components/error/AuthErrorBoundary';

function App() {
  return (
    <Router>
      <QueryClient>
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
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route path="/pricing" element={<Pricing />} />

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
                          <Route path="surveys/new" element={<NewSurvey />} />
                          <Route path="surveys/:id/edit" element={<EditSurvey />} />
                          <Route path="surveys/:id/responses" element={<Responses />} />
                          <Route path="settings" element={<Settings />} />
                          <Route path="billing" element={<Billing />} />
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
      </QueryClient>
    </Router>
  );
}

export default App;
