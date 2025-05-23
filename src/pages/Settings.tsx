
import React from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { User, ShieldCheck, CreditCard, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAdminRole } from '../hooks/useAdminRole';
import { signOutUser } from '../utils/auth';

const Settings = () => {
  const { user } = useAuth();
  const { isAdmin } = useAdminRole();

  const handleSignOut = async () => {
    await signOutUser();
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600">Manage your account and preferences</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User size={20} />
                  Profile
                </CardTitle>
                <CardDescription>
                  Manage your personal information and account details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/profile">
                  <Button variant="outline" className="w-full">
                    Edit Profile
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard size={20} />
                  My Purchases
                </CardTitle>
                <CardDescription>
                  View your purchase history and manage subscriptions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/purchases">
                  <Button variant="outline" className="w-full">
                    View Purchases
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck size={20} />
                    Admin
                  </CardTitle>
                  <CardDescription>
                    Access administrative functions and settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link to="/admin">
                    <Button variant="outline" className="w-full">
                      Admin Panel
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LogOut size={20} />
                  Sign Out
                </CardTitle>
                <CardDescription>
                  Sign out of your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={handleSignOut}
                >
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;
