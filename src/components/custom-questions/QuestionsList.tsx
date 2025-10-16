import React from 'react';
import { Edit, Archive, HelpCircle } from 'lucide-react';
import { Badge } from '../ui/badge';
import { useMediaQuery } from '@/hooks/use-media-query';
import { CustomQuestion } from '../../types/customQuestions';
import { useQuestionUsage } from '../../hooks/useQuestionUsage';

interface QuestionsListProps {
  questions: CustomQuestion[];
  onEdit: (question: CustomQuestion) => void;
  onArchive: (question: CustomQuestion) => void;
  showArchived: boolean;
}

const QuestionsList: React.FC<QuestionsListProps> = ({ 
  questions, 
  onEdit, 
  onArchive,
  showArchived 
}) => {
  const isMobile = useMediaQuery("(max-width: 768px)");

  if (questions.length === 0) {
    return (
      <div className="bg-card rounded-lg shadow-sm border border-border p-12 text-center">
        <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">
          {showArchived ? 'No archived questions' : 'No questions found'}
        </h2>
        <p className="text-muted-foreground mb-6">
          {showArchived 
            ? 'You don\'t have any archived questions.'
            : 'Click \'Add Question\' to create your first custom question.'}
        </p>
      </div>
    );
  }

  if (!isMobile) {
    return (
      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">      
        <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-muted border-b border-border text-sm font-medium text-muted-foreground uppercase">
          <div className="col-span-5">Question</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2">Usage</div>
          <div className="col-span-3 text-right">Actions</div>
        </div>
        
        <div className="divide-y divide-border">
          {questions.map((question) => (
            <QuestionRow
              key={question.id}
              question={question}
              onEdit={onEdit}
              onArchive={onArchive}
              isMobile={false}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {questions.map((question) => (
        <QuestionRow
          key={question.id}
          question={question}
          onEdit={onEdit}
          onArchive={onArchive}
          isMobile={true}
        />
      ))}
    </div>
  );
};

interface QuestionRowProps {
  question: CustomQuestion;
  onEdit: (question: CustomQuestion) => void;
  onArchive: (question: CustomQuestion) => void;
  isMobile: boolean;
}

const QuestionRow: React.FC<QuestionRowProps> = ({ 
  question, 
  onEdit, 
  onArchive,
  isMobile 
}) => {
  const { usage, isLoading } = useQuestionUsage(question.id);

  const getTypeDisplay = () => {
    return question.type === 'multiple_choice' ? 'Multiple Choice' : 'Free Text';
  };

  const getTypeBadgeColor = () => {
    return question.type === 'multiple_choice' 
      ? 'bg-blue-100 text-blue-700 border-blue-200' 
      : 'bg-purple-100 text-purple-700 border-purple-200';
  };

  const getUsageDisplay = () => {
    if (isLoading) return <span className="text-muted-foreground text-sm">Loading...</span>;
    
    if (!usage || usage.surveyCount === 0) {
      return <span className="text-muted-foreground text-sm">Not used</span>;
    }
    
    return (
      <span className="text-foreground text-sm font-medium">
        {usage.surveyCount} {usage.surveyCount === 1 ? 'survey' : 'surveys'}
      </span>
    );
  };

  if (!isMobile) {
    return (
      <div className="grid grid-cols-12 gap-4 px-6 py-5 items-center hover:bg-accent transition-colors">
        <div className="col-span-5">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-foreground font-medium truncate" title={question.text}>
                {question.text}
              </h3>
              {question.archived && (
                <Badge variant="outline" className="mt-1 text-xs">
                  Archived
                </Badge>
              )}
              {question.type === 'multiple_choice' && question.options && (
                <p className="text-xs text-muted-foreground mt-1">
                  {question.options.length} options
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="col-span-2">
          <Badge 
            variant="outline" 
            className={`${getTypeBadgeColor()} border`}
          >
            {getTypeDisplay()}
          </Badge>
        </div>
        
        <div className="col-span-2">
          {getUsageDisplay()}
        </div>
        
        <div className="col-span-3 flex justify-end space-x-3">
          <button 
            onClick={() => onEdit(question)}
            className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors whitespace-nowrap"
            title="Edit question"
          >
            <Edit size={16} className="mr-1" />
            <span>Edit</span>
          </button>
          
          <button 
            onClick={() => onArchive(question)}
            className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors whitespace-nowrap"
            title={question.archived ? 'Unarchive question' : 'Archive question'}
          >
            <Archive size={16} className="mr-1" />
            <span>{question.archived ? 'Unarchive' : 'Archive'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-4">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0 pr-3">
          <h3 className="text-foreground font-medium mb-2 break-words">
            {question.text}
          </h3>
          <Badge 
            variant="outline" 
            className={`${getTypeBadgeColor()} border text-xs`}
          >
            {getTypeDisplay()}
          </Badge>
        </div>
        {question.archived && (
          <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
            Archived
          </Badge>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm mb-3 border-t border-border pt-3">
        {question.type === 'multiple_choice' && question.options && (
          <div>
            <span className="text-muted-foreground">Options:</span>
            <div className="text-foreground">{question.options.length}</div>
          </div>
        )}
        
        <div className={question.type === 'text' ? 'col-span-2' : ''}>
          <span className="text-muted-foreground">Usage:</span>
          <div className="text-foreground">{getUsageDisplay()}</div>
        </div>
      </div>
      
      <div className="border-t border-border pt-3 flex gap-3">
        <button 
          onClick={() => onEdit(question)}
          className="flex-1 flex items-center justify-center text-sm text-muted-foreground hover:text-primary transition-colors py-2 border border-border rounded hover:border-primary"
        >
          <Edit size={16} className="mr-1" />
          <span>Edit</span>
        </button>
        
        <button 
          onClick={() => onArchive(question)}
          className="flex-1 flex items-center justify-center text-sm text-muted-foreground hover:text-primary transition-colors py-2 border border-border rounded hover:border-primary"
        >
          <Archive size={16} className="mr-1" />
          <span>{question.archived ? 'Unarchive' : 'Archive'}</span>
        </button>
      </div>
    </div>
  );
};

export default QuestionsList;
