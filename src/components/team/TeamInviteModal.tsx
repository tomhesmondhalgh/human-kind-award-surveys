
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Mail, UserPlus } from 'lucide-react';

interface TeamInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendInvitation: (data: { email: string; role: string }) => Promise<void>;
  isLoading?: boolean;
  organizationId?: string;
}

const TeamInviteModal: React.FC<TeamInviteModalProps> = ({
  isOpen,
  onClose,
  onSendInvitation,
  isLoading = false,
  organizationId
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [emailError, setEmailError] = useState('');
  const [existingMemberWarning, setExistingMemberWarning] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setEmailError('Email is required');
      return;
    }
    
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    try {
      await onSendInvitation({ email, role });
      setEmail('');
      setRole('viewer');
      setEmailError('');
      onClose();
    } catch (error) {
      console.error('Failed to send invitation:', error);
    }
  };

  const handleEmailChange = async (value: string) => {
    setEmail(value);
    if (emailError) {
      setEmailError('');
    }
    setExistingMemberWarning(false);

    // Check if email might already be a member (optimistic check)
    if (validateEmail(value) && organizationId) {
      try {
        // Get user by email
        const { data: authData } = await supabase.auth.admin.listUsers();
        const existingUser = authData?.users?.find((u: any) => u.email === value);
        
        if (existingUser) {
          // Check if they're already a member
          const { data: membership } = await supabase
            .from('organization_memberships')
            .select('id')
            .eq('user_id', existingUser.id)
            .eq('organization_id', organizationId)
            .single();
            
          if (membership) {
            setExistingMemberWarning(true);
          }
        }
      } catch (error) {
        // Silent fail - server-side validation will catch this
        console.log('Could not check for existing member (will be validated server-side)');
      }
    }
  };

  const handleClose = () => {
    setEmail('');
    setRole('viewer');
    setEmailError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus size={20} />
            Invite Team Member
          </DialogTitle>
          <DialogDescription>
            Send an invitation to join your organisation. They'll receive an email with instructions to accept.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                className={`pl-10 ${emailError ? 'border-red-500' : ''}`}
                disabled={isLoading}
              />
            </div>
            {emailError && (
              <p className="text-sm text-red-600">{emailError}</p>
            )}
            {existingMemberWarning && (
              <p className="text-sm text-amber-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                This user may already be a member
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={setRole} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">
                  <div className="flex flex-col">
                    <span>Viewer</span>
                    <span className="text-xs text-gray-500">Can view surveys and results</span>
                  </div>
                </SelectItem>
                <SelectItem value="editor">
                  <div className="flex flex-col">
                    <span>Editor</span>
                    <span className="text-xs text-gray-500">Can create and edit surveys</span>
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="flex flex-col">
                    <span>Administrator</span>
                    <span className="text-xs text-gray-500">Full access including team management</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TeamInviteModal;
