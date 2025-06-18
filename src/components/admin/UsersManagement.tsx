
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
  const [totalCount, setTotalCount] = useState(0);
  const [processingUsers, setProcessingUsers] = useState<Record<string, boolean>>({});
  
  const usersPerPage = 10;
  
  useEffect(() => {
    fetchUsers();
  }, [currentPage]);
  
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Call our edge function to get users instead of directly calling auth admin API
      const { data, error } = await supabase.functions.invoke('admin-get-users', {
        body: {
          page: currentPage,
          perPage: usersPerPage,
          searchQuery: searchQuery
        }
      });
      
      if (error) {
        throw new Error(`Failed to fetch users: ${error.message}`);
      }
      
      if (!data || !data.users) {
        setUsers([]);
        setIsLoading(false);
        return;
      }

      setUsers(data.users);
      setTotalCount(data.count || 0);
      setTotalPages(data.totalPages || Math.ceil((data.count || 0) / usersPerPage));
      
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
        .update({ is_admin: !currentAdminState } as any)
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
  
  const filteredUsers = users;
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  const handleSearchSubmit = () => {
    setCurrentPage(1); // Reset to first page on search
    fetchUsers();
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
              onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
              className="flex-1"
            />
            <Button 
              onClick={handleSearchSubmit}
              variant="default"
            >
              Search
            </Button>
            <Button 
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
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
