import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Eye } from 'lucide-react';
import { CustomQuestion } from '@/types/customQuestions';

interface QuestionPreviewDialogProps {
  questions: CustomQuestion[];
  isOpen: boolean;
  onClose: () => void;
}

const QuestionPreviewDialog: React.FC<QuestionPreviewDialogProps> = ({
  questions,
  isOpen,
  onClose
}) => {
  if (questions.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Question Preview
          </DialogTitle>
          <DialogDescription>
            This is how your custom questions will appear to survey respondents
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Note:</strong> These questions will appear after all standard wellbeing questions
            </p>
          </div>

          {questions.map((question, index) => (
            <div key={question.id} className="border rounded-lg p-6 bg-card shadow-sm">
              <div className="mb-4">
                <Label className="text-base font-medium">
                  Custom Question {index + 1}
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {question.type === 'text' ? 'Free text response' : 'Multiple choice'}
                </p>
              </div>
              
              <p className="font-medium mb-4">{question.text}</p>
              
              {question.type === 'text' ? (
                <Textarea 
                  disabled 
                  placeholder="Respondents will type their answer here..."
                  className="bg-muted"
                />
              ) : (
                <RadioGroup disabled className="space-y-2">
                  {question.options?.map((option, optIndex) => (
                    <div key={optIndex} className="flex items-center gap-2">
                      <RadioGroupItem value={option} id={`${question.id}-${optIndex}`} />
                      <Label htmlFor={`${question.id}-${optIndex}`} className="text-sm cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button onClick={onClose}>Close Preview</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuestionPreviewDialog;
