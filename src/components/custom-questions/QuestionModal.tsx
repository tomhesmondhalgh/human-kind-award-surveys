
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { CustomQuestion } from '../../types/customQuestions';
import { AlertCircle, Plus, X } from 'lucide-react';
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
  const [questionType, setQuestionType] = useState<'text' | 'multiple_choice'>('text');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { currentOrganization } = useOrganization();

  useEffect(() => {
    if (open && initialData) {
      setQuestionText(initialData.text);
      setQuestionType(initialData.type);
      setOptions(initialData.options && initialData.options.length > 0 ? initialData.options : ['', '']);
    } else if (!open) {
      setQuestionText('');
      setQuestionType('text');
      setOptions(['', '']);
      setError('');
    }
  }, [open, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    // Prevent the event from propagating to parent forms
    e.preventDefault();
    e.stopPropagation();
    
    setError('');

    // Validate question text
    if (!questionText.trim()) {
      setError('Question text is required');
      return;
    }
    
    if (questionText.length > 500) {
      setError('Question text must be 500 characters or less');
      return;
    }

    // Validate multiple choice options
    if (questionType === 'multiple_choice') {
      const validOptions = options.filter(o => o.trim());
      
      if (validOptions.length < 2) {
        setError('Multiple choice questions must have at least 2 options');
        return;
      }
      
      const tooLongOptions = validOptions.filter(o => o.length > 200);
      if (tooLongOptions.length > 0) {
        setError('Each option must be 200 characters or less');
        return;
      }
      
      const duplicates = validOptions.filter((option, index) => 
        validOptions.indexOf(option) !== index
      );
      if (duplicates.length > 0) {
        setError('Options must be unique');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const questionPayload = createDbQuestionPayload({
        text: questionText,
        type: questionType,
        options: questionType === 'multiple_choice' ? options.filter(o => o.trim()) : null
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
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {questionText.length}/500 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label>Question Type</Label>
            <RadioGroup 
              value={questionType} 
              onValueChange={(value) => setQuestionType(value as 'text' | 'multiple_choice')}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="text" id="type-text" />
                <Label htmlFor="type-text" className="font-normal cursor-pointer">Free Text</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="multiple_choice" id="type-multiple" />
                <Label htmlFor="type-multiple" className="font-normal cursor-pointer">Multiple Choice</Label>
              </div>
            </RadioGroup>
          </div>

          {questionType === 'multiple_choice' && (
            <div className="space-y-2">
              <Label>Answer Options</Label>
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...options];
                      newOptions[index] = e.target.value;
                      setOptions(newOptions);
                    }}
                    placeholder={`Option ${index + 1}`}
                    maxLength={200}
                  />
                  {options.length > 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setOptions(options.filter((_, i) => i !== index))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => setOptions([...options, ''])}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Option
              </Button>
            </div>
          )}

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
