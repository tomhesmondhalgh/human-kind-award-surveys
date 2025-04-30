
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Loader2, Search, AlertCircle, CheckCircle, Users } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Input } from "../ui/input";
import { toast } from "sonner";
import { Switch } from "../ui/switch";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "../ui/pagination";

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  schoolName: string;
  isAdmin: boolean;
  plan: string;
  surveyCount: number;
  responseCount: number;
  feedbackScore?: number;
  created_at: string;
}

const UsersManagement = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [processingUsers, setProcessingUsers] = useState<Record<string, boolean>>({});
  
  const usersPerPage = 10;
  
  useEffect(() => {
    fetchUsers();
  }, [currentPage]);
  
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // First, get users from auth
      const { data: userData, error: userError } = await supabase.auth.admin.listUsers({
        page: currentPage,
        perPage: usersPerPage
      });
      
      if (userError) {
        throw new Error(`Failed to fetch users: ${userError.message}`);
      }
      
      if (!userData || !userData.users) {
        setUsers([]);
        setIsLoading(false);
        return;
      }
      
      // Get the total count for pagination
      const { count, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
        
      if (countError) {
        console.error('Error counting users:', countError);
      } else {
        setTotalPages(Math.ceil((count || 0) / usersPerPage));
      }
      
      // Get user profiles for additional information
      const userIds = userData.users.map(user => user.id);
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
      
      if (profileError) {
        console.error('Error fetching profiles:', profileError);
      }
      
      // Map profiles to a dictionary for easy lookup
      const profileDict: Record<string, any> = {};
      if (profiles) {
        profiles.forEach(profile => {
          profileDict[profile.id] = profile;
        });
      }
      
      // Get subscription data for each user
      const { data: subscriptions, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .in('user_id', userIds)
        .order('created_at', { ascending: false });
        
      if (subError) {
        console.error('Error fetching subscriptions:', subError);
      }
      
      // Map subscriptions to users (get most recent subscription for each user)
      const subscriptionDict: Record<string, any> = {};
      if (subscriptions) {
        subscriptions.forEach(sub => {
          if (!subscriptionDict[sub.user_id] || new Date(sub.created_at) > new Date(subscriptionDict[sub.user_id].created_at)) {
            subscriptionDict[sub.user_id] = sub;
          }
        });
      }
      
      // Get survey counts for each user
      const surveyCounts: Record<string, number> = {};
      const responseCounts: Record<string, number> = {};
      
      await Promise.all(userIds.map(async (userId) => {
        // Count surveys
        const { count: surveyCount, error: surveyError } = await supabase
          .from('survey_templates')
          .select('id', { count: 'exact', head: true })
          .eq('creator_id', userId);
          
        if (!surveyError) {
          surveyCounts[userId] = surveyCount || 0;
        }
        
        // Get survey IDs for this user
        const { data: surveys, error: surveysError } = await supabase
          .from('survey_templates')
          .select('id')
          .eq('creator_id', userId);
          
        if (!surveysError && surveys && surveys.length > 0) {
          const surveyIds = surveys.map(s => s.id);
          
          // Count responses across all surveys
          const { count: responseCount, error: responseError } = await supabase
            .from('survey_responses')
            .select('id', { count: 'exact', head: true })
            .in('survey_template_id', surveyIds);
            
          if (!responseError) {
            responseCounts[userId] = responseCount || 0;
          }
        } else {
          responseCounts[userId] = 0;
        }
      }));
      
      // Combine all data
      const combinedUsers: UserData[] = userData.users.map(user => {
        const profile = profileDict[user.id] || {};
        const subscription = subscriptionDict[user.id] || {};
        
        return {
          id: user.id,
          email: user.email || '',
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          schoolName: profile.school_name || '',
          isAdmin: profile.is_admin || false,
          plan: subscription.plan_type || 'free',
          surveyCount: surveyCounts[user.id] || 0,
          responseCount: responseCounts[user.id] || 0,
          created_at: user.created_at || ''
        };
      });
      
      setUsers(combinedUsers);
      
    } catch (err) {
      console.error('Error in fetchUsers:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching users');
    } finally {
      setIsLoading(false);
    }
  };
  
  const toggleAdminRole = async (userId: string, currentAdminState: boolean) => {
    try {
      setProcessingUsers(prev => ({ ...prev, [userId]: true }));
      
      const { data, error } = await supabase
        .from('profiles')
        .update({ is_admin: !currentAdminState })
        .eq('id', userId)
        .select();
      
      if (error) {
        throw new Error(`Failed to update user role: ${error.message}`);
      }
      
      // Update the local state
      setUsers(users.map(user => {
        if (user.id === userId) {
          return { ...user, isAdmin: !currentAdminState };
        }
        return user;
      }));
      
      toast.success(`User admin status ${!currentAdminState ? 'granted' : 'revoked'} successfully`);
      
    } catch (err) {
      console.error('Error toggling admin role:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update user role');
    } finally {
      setProcessingUsers(prev => ({ ...prev, [userId]: false }));
    }
  };
  
  const filteredUsers = searchQuery 
    ? users.filter(user => 
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.schoolName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : users;
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };
  
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-GB');
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>
          View and manage users on the platform
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="mb-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-500" />
            <Input 
              placeholder="Search users by name, email or school..." 
              value={searchQuery}
              onChange={handleSearch}
              className="flex-1"
            />
            <Button 
              onClick={() => {
                setSearchQuery('');
                fetchUsers();
              }}
              variant="outline"
            >
              Clear
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : (
          <>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-center">Surveys</TableHead>
                    <TableHead className="text-center">Responses</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-center">Admin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {searchQuery ? 'No users match your search criteria' : 'No users found'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map(user => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.firstName} {user.lastName}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>{user.schoolName || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={user.plan === 'premium' ? 'default' : 
                                         user.plan === 'progress' ? 'secondary' :
                                         user.plan === 'foundation' ? 'outline' : 'secondary'}>
                            {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{user.surveyCount}</TableCell>
                        <TableCell className="text-center">{user.responseCount}</TableCell>
                        <TableCell>{formatDate(user.created_at)}</TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={user.isAdmin}
                            disabled={processingUsers[user.id]}
                            onCheckedChange={() => toggleAdminRole(user.id, user.isAdmin)}
                          />
                          {processingUsers[user.id] && (
                            <span className="ml-2"><Loader2 className="h-4 w-4 inline animate-spin" /></span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {totalPages > 1 && (
              <div className="mt-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage > 1) setCurrentPage(currentPage - 1);
                        }}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <PaginationItem key={page}>
                        <PaginationLink 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage(page);
                          }}
                          isActive={currentPage === page}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    
                    <PaginationItem>
                      <PaginationNext 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                        }}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default UsersManagement;
