import React, { useState } from 'react';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

interface ResetTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  sectionName: string;
}

const ResetTemplateDialog: React.FC<ResetTemplateDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  sectionName
}) => {
  const [isResetting, setIsResetting] = useState(false);

  const handleConfirm = async () => {
    setIsResetting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Error resetting:', error);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <AlertDialogTitle>Reset Section to Template?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-2">
            <p>
              This will reset <strong>{sectionName}</strong> back to the original template, 
              removing all your custom changes including:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>All status changes (Completed, In Progress, etc.)</li>
              <li>All assigned team members</li>
              <li>All key actions you've added</li>
              <li>All progress notes</li>
              <li>All deadline dates</li>
            </ul>
            <p className="font-medium text-destructive mt-4">
              This action cannot be undone.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isResetting}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {isResetting ? 'Resetting...' : 'Yes, Reset Section'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ResetTemplateDialog;
