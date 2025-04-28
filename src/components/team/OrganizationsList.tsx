
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { Building, Plus, Search, MoreVertical } from 'lucide-react';
import { Input } from '../ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Pagination from '../surveys/Pagination';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button as UIButton } from '../ui/button';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Organization } from '@/types/organizations';

const ITEMS_PER_PAGE = 10;

const createOrgFormSchema = z.object({
  name: z.string().min(2, { message: "Organisation name must be at least 2 characters" }),
});

type CreateOrgFormValues = z.infer<typeof createOrgFormSchema>;

// Simple component to replace the group-based dialog
const CreateOrganizationDialog = ({ 
  isOpen, 
  onClose, 
  onComplete 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onComplete: () => void; 
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<CreateOrgFormValues>({
    resolver: zodResolver(createOrgFormSchema),
    defaultValues: {
      name: '',
    },
  });

  const handleSubmit = async (values: CreateOrgFormValues) => {
    setIsSubmitting(true);
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      // Create the organization profile
      const { data: orgData, error: orgError } = await supabase
        .from('profiles')
        .insert({
          id: crypto.randomUUID(),
          school_name: values.name,
        })
        .select('id')
        .single();
        
      if (orgError) {
        throw orgError;
      }
      
      toast.success('Organisation created successfully');
      form.reset();
      onComplete();
    } catch (error) {
      console.error('Error creating organisation:', error);
      toast.error('Failed to create organisation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Organisation</DialogTitle>
          <DialogDescription>
            Create a new organisation to manage your team
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organisation Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter organisation name" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="mt-6">
              <UIButton 
                type="button" 
                variant="ghost" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </UIButton>
              <UIButton 
                type="submit"
                disabled={isSubmitting}
                className="bg-brandPurple-500 hover:bg-brandPurple-600"
              >
                {isSubmitting ? 'Creating...' : 'Create Organisation'}
              </UIButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

const OrganizationsList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: organizationsData, isLoading, refetch } = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      // Get the current user
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      if (!userId) {
        return { organizations: [], total: 0 };
      }
      
      // Get the user's profile which serves as their organization
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) {
        toast.error('Failed to load user organizations');
        throw error;
      }
      
      // Create an organization object from the profile
      const organizations: Organization[] = profile ? [
        {
          id: profile.id,
          name: profile.school_name || 'My Organisation',
          created_at: profile.created_at || new Date().toISOString(),
          updated_at: profile.updated_at || new Date().toISOString()
        }
      ] : [];
      
      return {
        organizations,
        total: organizations.length
      };
    }
  });

  // Filter organizations based on search term
  const filteredOrganizations = organizationsData?.organizations.filter(org => {
    const orgName = org.name || '';
    return searchTerm === '' || orgName.toLowerCase().includes(searchTerm.toLowerCase());
  }) || [];
  
  // Pagination
  const totalPages = Math.ceil(filteredOrganizations.length / ITEMS_PER_PAGE);
  const paginatedOrganizations = filteredOrganizations.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleCreateComplete = () => {
    refetch();
    setIsCreateDialogOpen(false);
  };

  const handleRemoveOrganization = async (orgId: string) => {
    if (!confirm("Are you sure you want to remove this organization? This will remove all members and data.")) return;
    
    try {
      // Remove the organization profile
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', orgId);
        
      if (error) {
        throw error;
      }
      
      toast.success('Organization removed successfully');
      refetch();
    } catch (error) {
      console.error('Error removing organization:', error);
      toast.error('Failed to remove organization');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Organizations</h2>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-brandPurple-500 hover:bg-brandPurple-600"
        >
          <Plus size={16} className="mr-2" />
          Create Organization
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <Input
            placeholder="Search organizations..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset to first page on search
            }}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-brandPurple-500 border-t-transparent rounded-full"></div>
        </div>
      ) : paginatedOrganizations.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No organizations found</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedOrganizations.map((organization) => (
                  <tr key={organization.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <Building size={16} className="text-blue-600" />
                        </div>
                        <div className="ml-4 text-sm font-medium text-gray-900">
                          {organization.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(organization.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <a href={`/team?organization=${organization.id}`} className="w-full">
                              Manage Members
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleRemoveOrganization(organization.id)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      )}

      <CreateOrganizationDialog 
        isOpen={isCreateDialogOpen} 
        onClose={() => setIsCreateDialogOpen(false)} 
        onComplete={handleCreateComplete}
      />
    </div>
  );
};

export default OrganizationsList;
