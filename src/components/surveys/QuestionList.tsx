
import React from 'react';
import { useCustomQuestions } from '../../hooks/useCustomQuestions';
import { Badge } from '../ui/badge';
import { X } from 'lucide-react';

interface QuestionListProps {
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  isCompact?: boolean;
}

const QuestionList: React.FC<QuestionListProps> = ({ 
  selectedIds, 
  onChange,
  isCompact = false
}) => {
  const { questions } = useCustomQuestions();
  
  // Filter to only show selected questions
  const selectedQuestions = questions
    .filter(question => selectedIds.includes(question.id))
    .filter(question => !question.archived);
  
  // Remove a question from selection
  const removeQuestion = (id: string) => {
    const newSelected = selectedIds.filter(selectedId => selectedId !== id);
    onChange(newSelected);
  };
  
  if (selectedQuestions.length === 0) {
    return null;
  }
  
  return (
    <div className={`space-y-2 ${isCompact ? '' : 'mt-4'}`}>
      {selectedQuestions.map((question) => (
        <div 
          key={question.id} 
          className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md"
        >
          <div className="flex items-center gap-3 flex-1 overflow-hidden">
            <p className={`${isCompact ? 'text-sm' : 'text-base'} font-medium truncate`}>{question.text}</p>
            <div className="flex items-center flex-shrink-0">
              <Badge variant="outline" className="text-xs whitespace-nowrap">
                {question.type === 'multiple_choice' ? 'Multiple Choice' : 'Free Text'}
              </Badge>
            </div>
          </div>
          
          <button
            onClick={() => removeQuestion(question.id)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 flex-shrink-0 ml-2"
            aria-label="Remove question"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default QuestionList;
