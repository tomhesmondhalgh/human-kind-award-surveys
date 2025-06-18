import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Award, Eye, CheckCircle, XCircle, Clock, AlertCircle, Search } from 'lucide-react';

// Use a simplified type that matches what we actually need
type DatabaseSubmission = {
  id: string;
  user_id: string;
  organization_id: string;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  approved_at?: string;
  next_submission_due?: string;
  reviewer_notes?: string;
  submission_data?: any;
  created_at: string;
  updated_at: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
    school_name?: string;
  };
};

type AccreditationStatus = 'submitted' | 'under_review' | 'approved' | 'rejected';

const AccreditationManagement = () => {
  const [submissions, setSubmissions] = useState<DatabaseSubmission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<DatabaseSubmission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AccreditationStatus | 'all'>('all');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      console.log('Fetching accreditation submissions...');
      
      const { data, error } = await supabase
        .from('action_plan_submissions')
        .select(`
          *,
          profiles(first_name, last_name, school_name)
        `)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('Error fetching submissions:', error);
        toast.error('Failed to load submissions');
        return;
      }

      console.log('Fetched submissions:', data);
      
      // Safely transform the data to match our expected type
      if (data && Array.isArray(data)) {
        const typedSubmissions: DatabaseSubmission[] = data.map((item: any) => ({
          id: item.id,
          user_id: item.user_id,
          organization_id: item.organization_id,
          status: item.status,
          submitted_at: item.submitted_at,
          reviewed_at: item.reviewed_at,
          approved_at: item.approved_at,
          next_submission_due: item.next_submission_due,
          reviewer_notes: item.reviewer_notes,
          submission_data: item.submission_data,
          created_at: item.created_at,
          updated_at: item.updated_at,
          profiles: item.profiles || undefined
        }));
        
        setSubmissions(typedSubmissions);
      } else {
        setSubmissions([]);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast.error('Failed to load submissions');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: AccreditationStatus) => {
    switch (status) {
      case 'submitted':
        return <Badge className="bg-blue-500"><Clock className="h-3 w-3 mr-1" />Submitted</Badge>;
      case 'under_review':
        return <Badge className="bg-yellow-500"><AlertCircle className="h-3 w-3 mr-1" />Under Review</Badge>;
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge>Unknown Status</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleStatusUpdate = async (submissionId: string, newStatus: AccreditationStatus) => {
    setIsUpdating(true);
    try {
      const updateData: any = {
        status: newStatus,
        reviewed_at: new Date().toISOString(),
      };

      if (newStatus === 'approved') {
        updateData.approved_at = new Date().toISOString();
        // Set next submission due date to 12 months from now
        const nextDue = new Date();
        nextDue.setFullYear(nextDue.getFullYear() + 1);
        updateData.next_submission_due = nextDue.toISOString();
      }

      if (reviewNotes.trim()) {
        updateData.reviewer_notes = reviewNotes.trim();
      }

      const { error } = await supabase
        .from('action_plan_submissions')
        .update(updateData as any)
        .eq('id', submissionId as any);

      if (error) {
        console.error('Error updating submission:', error);
        toast.error('Failed to update submission');
        return;
      }

      toast.success(`Submission ${newStatus === 'approved' ? 'approved' : 'rejected'} successfully`);
      setIsReviewDialogOpen(false);
      setReviewNotes('');
      setSelectedSubmission(null);
      fetchSubmissions();
    } catch (error) {
      console.error('Error updating submission:', error);
      toast.error('Failed to update submission');
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredSubmissions = submissions.filter(submission => {
    const matchesSearch = searchTerm === '' || 
      submission.profiles?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.profiles?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.profiles?.school_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || submission.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getSubmissionStats = () => {
    return {
      total: submissions.length,
      pending: submissions.filter(s => s.status === 'submitted').length,
      under_review: submissions.filter(s => s.status === 'under_review').length,
      approved: submissions.filter(s => s.status === 'approved').length,
      rejected: submissions.filter(s => s.status === 'rejected').length,
    };
  };

  const stats = getSubmissionStats();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="mb-4">Loading accreditation submissions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Award className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Accreditation Reviews</h1>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total Submissions</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.under_review}</div>
              <div className="text-sm text-muted-foreground">Under Review</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
              <div className="text-sm text-muted-foreground">Approved</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              <div className="text-sm text-muted-foreground">Rejected</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or school..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as AccreditationStatus | 'all')}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Accreditation Submissions</CardTitle>
          <CardDescription>
            Review and manage action plan accreditation submissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-8">
              <Award className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">No Submissions Found</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all' 
                  ? 'No submissions match your current filters.' 
                  : 'No accreditation submissions have been made yet.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Submitter</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubmissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell>
                      <div className="font-medium">
                        {submission.profiles?.first_name} {submission.profiles?.last_name}
                      </div>
                    </TableCell>
                    <TableCell>{submission.profiles?.school_name || 'N/A'}</TableCell>
                    <TableCell>{formatDate(submission.submitted_at)}</TableCell>
                    <TableCell>{getStatusBadge(submission.status)}</TableCell>
                    <TableCell>
                      <Dialog 
                        open={isReviewDialogOpen && selectedSubmission?.id === submission.id} 
                        onOpenChange={(open) => {
                          setIsReviewDialogOpen(open);
                          if (!open) {
                            setSelectedSubmission(null);
                            setReviewNotes('');
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedSubmission(submission);
                              setReviewNotes(submission.reviewer_notes || '');
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Review Accreditation Submission</DialogTitle>
                            <DialogDescription>
                              Review the action plan submission and update its status
                            </DialogDescription>
                          </DialogHeader>
                          
                          {selectedSubmission && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium">Submitter</label>
                                  <p>{selectedSubmission.profiles?.first_name} {selectedSubmission.profiles?.last_name}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">School</label>
                                  <p>{selectedSubmission.profiles?.school_name || 'N/A'}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Submitted</label>
                                  <p>{formatDate(selectedSubmission.submitted_at)}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Current Status</label>
                                  <div>{getStatusBadge(selectedSubmission.status)}</div>
                                </div>
                              </div>

                              {selectedSubmission.submission_data && (
                                <div>
                                  <label className="text-sm font-medium">Action Plan Summary</label>
                                  <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                                    {selectedSubmission.submission_data.map((section: any, index: number) => (
                                      <div key={index} className="mb-2">
                                        <strong>{section.title}:</strong> {section.completedCount} completed, {section.notApplicableCount} not applicable
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div>
                                <label className="text-sm font-medium">Review Notes</label>
                                <Textarea
                                  value={reviewNotes}
                                  onChange={(e) => setReviewNotes(e.target.value)}
                                  placeholder="Add notes about this review..."
                                  className="mt-1"
                                  rows={3}
                                />
                              </div>

                              {selectedSubmission.status !== 'approved' && selectedSubmission.status !== 'rejected' && (
                                <div className="flex gap-2 pt-4">
                                  <Button
                                    onClick={() => handleStatusUpdate(selectedSubmission.id, 'approved')}
                                    disabled={isUpdating}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    onClick={() => handleStatusUpdate(selectedSubmission.id, 'rejected')}
                                    disabled={isUpdating}
                                    variant="destructive"
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AccreditationManagement;
