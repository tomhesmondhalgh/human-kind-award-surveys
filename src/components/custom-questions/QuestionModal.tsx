
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { CustomQuestion } from '../../types/customQuestions';
import { AlertCircle } from 'lucide-react';
import { createDbQuestionPayload } from '../../utils/questionTypeUtils';
import { useOrganization } from '../../contexts/OrganizationContext';

interface QuestionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (questionData: Omit<CustomQuestion, 'id' | 'created_at' | 'archived' | 'creator_id'>) => Promise<void>;
  initialData?: CustomQuestion;
}

export default function QuestionModal({
  open,
  onOpenChange,
  onSave,
  initialData
}: QuestionModalProps) {
  const [questionText, setQuestionText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { currentOrganization } = useOrganization();

  useEffect(() => {
    if (open && initialData) {
      setQuestionText(initialData.text);
    } else if (!open) {
      setQuestionText('');
      setError('');
    }
  }, [open, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    // Prevent the event from propagating to parent forms
    e.preventDefault();
    e.stopPropagation();
    
    setError('');

    if (!questionText.trim()) {
      setError('Question text is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const questionPayload = createDbQuestionPayload({
        text: questionText,
        type: 'text'
      }, currentOrganization?.id);
      
      await onSave(questionPayload);
      onOpenChange(false);
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      setError('Failed to save question. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit Question' : 'Create Question'}
          </DialogTitle>
          <DialogDescription>
            {currentOrganization 
              ? `Create a custom question for ${currentOrganization.name}` 
              : 'Create a global custom question'
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="question-text">Question Text</Label>
            <Input
              id="question-text"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              maxLength={100}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              onClick={(e) => {
                // We already handle submission in the form's onSubmit
                // This just prevents any possible propagation
                e.stopPropagation();
              }}
            >
              {isSubmitting ? 'Saving...' : (initialData ? 'Update' : 'Create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
