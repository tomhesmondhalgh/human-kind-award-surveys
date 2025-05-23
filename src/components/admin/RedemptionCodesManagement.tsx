
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { Badge } from "../ui/badge";
import { PlanType } from "../upgrade/PlanCard";
import { 
  Copy, 
  Edit, 
  Loader2, 
  PlusCircle, 
  RefreshCw, 
  Trash2, 
  Users
} from "lucide-react";
import { AdminRedemptionCodeService, RedemptionCode } from "../../services/redemptionCodeService";
import { useToast } from "../../hooks/use-toast";

const RedemptionCodesManagement: React.FC = () => {
  const [codes, setCodes] = useState<RedemptionCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewRedemptionsDialogOpen, setIsViewRedemptionsDialogOpen] = useState(false);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [redemptionsLoading, setRedemptionsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentCode, setCurrentCode] = useState<RedemptionCode | null>(null);
  const { toast } = useToast();
  
  const [formValues, setFormValues] = useState({
    code: '',
    plan_type: 'foundation' as PlanType,
    max_uses: 1,
    expires_at: '',
    is_active: true
  });
  
  useEffect(() => {
    fetchCodes();
  }, []);
  
  const fetchCodes = async () => {
    setLoading(true);
    try {
      const data = await AdminRedemptionCodeService.getAllCodes();
      setCodes(data);
    } catch (error) {
      console.error('Error fetching redemption codes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load redemption codes',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateCode = () => {
    setCurrentCode(null);
    setFormValues({
      code: generateRandomCode(),
      plan_type: 'foundation',
      max_uses: 1,
      expires_at: '',
      is_active: true
    });
    setIsDialogOpen(true);
  };
  
  const handleEditCode = (code: RedemptionCode) => {
    setCurrentCode(code);
    setFormValues({
      code: code.code,
      plan_type: code.plan_type as PlanType,
      max_uses: code.max_uses,
      expires_at: code.expires_at ? new Date(code.expires_at).toISOString().split('T')[0] : '',
      is_active: code.is_active
    });
    setIsDialogOpen(true);
  };
  
  const handleDeleteCode = (code: RedemptionCode) => {
    setCurrentCode(code);
    setIsDeleteDialogOpen(true);
  };
  
  const handleViewRedemptions = async (code: RedemptionCode) => {
    setCurrentCode(code);
    setIsViewRedemptionsDialogOpen(true);
    setRedemptionsLoading(true);
    
    try {
      const data = await AdminRedemptionCodeService.getRedemptions(code.id);
      setRedemptions(data);
    } catch (error) {
      console.error('Error fetching redemptions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load redemption details',
        variant: 'destructive'
      });
    } finally {
      setRedemptionsLoading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    try {
      if (currentCode) {
        // Update existing code
        await AdminRedemptionCodeService.updateCode(currentCode.id, formValues);
        toast({
          title: 'Success',
          description: 'Redemption code updated successfully'
        });
      } else {
        // Create new code
        await AdminRedemptionCodeService.createCode(formValues);
        toast({
          title: 'Success',
          description: 'Redemption code created successfully'
        });
      }
      
      // Refresh the codes list
      fetchCodes();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving redemption code:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save redemption code',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleDelete = async () => {
    if (!currentCode) return;
    setIsProcessing(true);
    
    try {
      await AdminRedemptionCodeService.deleteCode(currentCode.id);
      toast({
        title: 'Success',
        description: 'Redemption code deleted successfully'
      });
      
      // Refresh the codes list
      fetchCodes();
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting redemption code:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete redemption code',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const generateRandomCode = () => {
    // Generate a random 8-character alphanumeric code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing characters like O, 0, 1, I
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Redemption code copied to clipboard'
    });
  };
  
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-GB');
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Redemption Codes Management</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={fetchCodes}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm" onClick={handleCreateCode}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Code
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Manage redemption codes for plan upgrades
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Plan Type</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Uses</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                      No redemption codes found. Create your first code to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  codes.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell className="font-mono font-bold">
                        {code.code}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 ml-1"
                          onClick={() => copyToClipboard(code.code)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          code.plan_type === 'premium' ? 'default' : 
                          code.plan_type === 'progress' ? 'secondary' : 
                          'outline'
                        }>
                          {code.plan_type.charAt(0).toUpperCase() + code.plan_type.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {code.is_active ? (
                          <Badge variant="success" className="bg-green-100 text-green-800 hover:bg-green-200">Active</Badge>
                        ) : (
                          <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-200">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {code.current_uses} / {code.max_uses === 0 ? '∞' : code.max_uses}
                      </TableCell>
                      <TableCell>
                        {formatDate(code.expires_at)}
                      </TableCell>
                      <TableCell>
                        {formatDate(code.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleViewRedemptions(code)}>
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEditCode(code)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteCode(code)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Create/Edit Code Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{currentCode ? 'Edit Redemption Code' : 'Create Redemption Code'}</DialogTitle>
              <DialogDescription>
                {currentCode 
                  ? 'Update the details of this redemption code.' 
                  : 'Create a new redemption code for users to upgrade their plans.'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    value={formValues.code}
                    onChange={(e) => setFormValues({...formValues, code: e.target.value.toUpperCase()})}
                    placeholder="ABCD1234"
                    required
                    className="uppercase"
                  />
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setFormValues({...formValues, code: generateRandomCode()})}
                  >
                    Generate
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="plan_type">Plan Type</Label>
                <Select 
                  value={formValues.plan_type}
                  onValueChange={(value) => setFormValues({...formValues, plan_type: value as PlanType})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="foundation">Foundation</SelectItem>
                    <SelectItem value="progress">Progress</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="max_uses">Maximum Uses</Label>
                <Input
                  id="max_uses"
                  type="number"
                  min="0"
                  value={formValues.max_uses}
                  onChange={(e) => setFormValues({...formValues, max_uses: parseInt(e.target.value) || 0})}
                  placeholder="1"
                  required
                  title="0 means unlimited uses"
                />
                <p className="text-xs text-muted-foreground">Set to 0 for unlimited uses</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="expires_at">Expiry Date (optional)</Label>
                <Input
                  id="expires_at"
                  type="date"
                  value={formValues.expires_at}
                  onChange={(e) => setFormValues({...formValues, expires_at: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formValues.is_active}
                  onCheckedChange={(checked) => setFormValues({...formValues, is_active: checked})}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isProcessing}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {currentCode ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    currentCode ? 'Update Code' : 'Create Code'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Redemption Code</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the redemption code "{currentCode?.code}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isProcessing}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Code'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Redemptions Dialog */}
        <Dialog open={isViewRedemptionsDialogOpen} onOpenChange={setIsViewRedemptionsDialogOpen}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Redemptions for Code: {currentCode?.code}</DialogTitle>
              <DialogDescription>
                Users who have redeemed this code
              </DialogDescription>
            </DialogHeader>
            
            {redemptionsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              </div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>School</TableHead>
                      <TableHead>Redeemed On</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {redemptions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                          No redemptions found for this code.
                        </TableCell>
                      </TableRow>
                    ) : (
                      redemptions.map((redemption) => (
                        <TableRow key={redemption.id}>
                          <TableCell>
                            <div>
                              <div>
                                {redemption.user?.profile?.first_name} {redemption.user?.profile?.last_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {redemption.user?.email?.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {redemption.user?.profile?.school_name || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {formatDate(redemption.redeemed_at)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
            
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsViewRedemptionsDialogOpen(false)} 
              className="mt-4"
            >
              Close
            </Button>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default RedemptionCodesManagement;
