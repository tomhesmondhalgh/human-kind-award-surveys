
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { PlusCircle } from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';
import CustomQuestionsModal from './CustomQuestionsModal';
import QuestionList from './QuestionList';
import { useIsMobile } from '@/hooks/use-mobile';

interface CustomQuestionsSelectProps {
  selectedQuestionIds: string[];
  onChange: (selectedIds: string[]) => void;
}

const CustomQuestionsSelect: React.FC<CustomQuestionsSelectProps> = ({
  selectedQuestionIds,
  onChange
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isPremium, isProgress, isFoundation } = useSubscription();
  const isMobile = useIsMobile();
  
  const hasAccess = isPremium || isProgress || isFoundation;
  
  const openModal = (e: React.MouseEvent) => {
    // Prevent the event from propagating to parent elements (like the form)
    e.preventDefault();
    e.stopPropagation();
    setIsModalOpen(true);
  };
  
  const closeModal = () => setIsModalOpen(false);
  
  if (!hasAccess) {
    return (
      <div className="mb-8 border border-gray-200 rounded-md p-4 bg-gray-50">
        <div className={`flex ${isMobile ? 'flex-col' : 'items-center justify-between'} mb-3`}>
          <h3 className="text-lg font-medium mb-2">Custom Questions</h3>
          <Badge variant="outline" className="bg-gray-100 self-start">Premium Feature</Badge>
        </div>
        <p className="text-gray-600 mb-4">
          Add your own custom questions to this survey. This feature requires a Foundation, Progress, or Premium plan.
        </p>
        <Button 
          onClick={() => window.location.href = '/upgrade'} 
          variant="default"
          className="w-full sm:w-auto"
        >
          Upgrade to Access
        </Button>
      </div>
    );
  }
  
  return (
    <div className="mb-8 border border-gray-200 rounded-md p-4">
      <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center justify-between'} mb-4`}>
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium">Custom Questions</h3>
          {selectedQuestionIds.length > 0 && (
            <Badge variant="secondary">{selectedQuestionIds.length} selected</Badge>
          )}
        </div>
        
        <Button 
          onClick={openModal}
          className="flex items-center gap-2 w-full sm:w-auto"
          type="button" // Explicitly set button type to prevent form submission
        >
          <PlusCircle size={16} />
          {selectedQuestionIds.length > 0 ? 'Edit Selection' : 'Add Questions'}
        </Button>
      </div>
      
      <p className="text-gray-600 mb-4">
        Add your own custom questions to this survey. These will appear after the standard questions.
      </p>
      
      {selectedQuestionIds.length > 0 ? (
        <QuestionList 
          selectedIds={selectedQuestionIds} 
          onChange={onChange} 
          isCompact={true} 
        />
      ) : (
        <div className="py-8 text-center border border-dashed border-gray-200 rounded-md bg-gray-50">
          <p className="text-gray-500 mb-2">No custom questions selected</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={openModal}
            className="flex items-center gap-2 mx-auto"
            type="button" // Explicitly set button type to prevent form submission
          >
            <PlusCircle size={16} />
            Select Questions
          </Button>
        </div>
      )}
      
      <CustomQuestionsModal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        selectedIds={selectedQuestionIds}
        onChange={onChange}
      />
    </div>
  );
};

export default CustomQuestionsSelect;
