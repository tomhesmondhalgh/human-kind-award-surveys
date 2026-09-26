
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Search, X, Check, ArrowRight, Plus, RefreshCw } from 'lucide-react';
import { useCustomQuestions } from '../../hooks/useCustomQuestions';
import { CustomQuestion } from '../../types/customQuestions';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import QuestionModal from '../custom-questions/QuestionModal';

interface CustomQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
}

const CustomQuestionsModal: React.FC<CustomQuestionsModalProps> = ({
  isOpen,
  onClose,
  selectedIds,
  onChange
}) => {
  const { questions = [], isLoading, refreshQuestions, createQuestion } = useCustomQuestions();
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isNewQuestionModalOpen, setIsNewQuestionModalOpen] = useState(false);
  const navigate = useNavigate();
  
  // Filter questions based on search term only (removed type filter)
  const filteredQuestions = questions
    .filter(q => !q.archived)
    .filter(q => q.text.toLowerCase().includes(searchTerm.toLowerCase()));
  
  // Handle question selection
  const toggleQuestion = (questionId: string, e: React.MouseEvent) => {
    // Prevent any possible propagation to parent forms
    e.preventDefault();
    e.stopPropagation();
    
    const newSelected = selectedIds.includes(questionId)
      ? selectedIds.filter(id => id !== questionId)
      : [...selectedIds, questionId];
    
    onChange(newSelected);
  };
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  // Clear search
  const clearSearch = (e: React.MouseEvent) => {
    e.preventDefault();
    setSearchTerm('');
  };
  
  // Handle refresh
  const handleRefresh = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      setRefreshing(true);
      await refreshQuestions();
      toast.success("Questions refreshed");
    } catch (error) {
      console.error("Error refreshing questions:", error);
      toast.error("Failed to refresh questions");
    } finally {
      setRefreshing(false);
    }
  };
  
  // Navigate to create new question page
  const handleCreateNew = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsNewQuestionModalOpen(true);
  };
  
  // Handle saving a new question
  const handleSaveNewQuestion = async (questionData: Omit<CustomQuestion, 'id' | 'created_at' | 'archived' | 'creator_id'>) => {
    try {
      const newQuestion = await createQuestion(questionData);
      if (newQuestion && newQuestion.id) {
        toast.success("New question created");
        // Select the newly created question automatically
        const newSelectedIds = [...selectedIds, newQuestion.id];
        onChange(newSelectedIds);
        // Close the nested modal
        setIsNewQuestionModalOpen(false);
        return Promise.resolve();
      }
      return Promise.reject("Failed to create question");
    } catch (error) {
      console.error("Error creating question:", error);
      toast.error("Failed to create question");
      return Promise.reject(error);
    }
  };
  
  // Effect to refresh questions when modal opens
  useEffect(() => {
    if (isOpen) {
      refreshQuestions().catch(err => {
        console.error("Error refreshing questions on open:", err);
      });
    }
  }, [isOpen, refreshQuestions]);

  const handleConfirm = (e: React.MouseEvent) => {
    e.preventDefault();
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Select Custom Questions</DialogTitle>
          </DialogHeader>
          
          <div className="flex items-center justify-between mb-4 gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <Input
                placeholder="Search questions..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-8 pr-8"
              />
              {searchTerm && (
                <button 
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  type="button"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing || isLoading}
              type="button"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            </Button>
          </div>

          <div className="mb-4">
            <Button
              onClick={handleCreateNew}
              variant="default"
              className="w-full flex items-center justify-center gap-2"
              type="button"
            >
              <Plus size={16} />
              Create New Question
            </Button>
          </div>
          
          {(isLoading || refreshing) ? (
            <div className="py-12 text-center">
              <p className="text-gray-500">Loading questions...</p>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500 mb-4">No matching questions found</p>
              <Button 
                onClick={handleCreateNew}
                variant="outline"
                className="flex items-center gap-2 mx-auto"
                type="button"
              >
                <Plus size={16} />
                Create a New Question
              </Button>
            </div>
          ) : (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-2">
                {filteredQuestions.map((question) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    isSelected={selectedIds.includes(question.id)}
                    onToggle={(e) => toggleQuestion(question.id, e)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
          
          <DialogFooter className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="text-sm">
              {selectedIds.length} questions selected
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} type="button">
                Cancel
              </Button>
              <Button onClick={handleConfirm} className="flex items-center gap-2" type="button">
                <Check size={16} />
                Confirm Selection
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nested Question Creation Modal */}
      <QuestionModal
        open={isNewQuestionModalOpen}
        onOpenChange={setIsNewQuestionModalOpen}
        onSave={handleSaveNewQuestion}
      />
    </>
  );
};

interface QuestionCardProps {
  question: CustomQuestion;
  isSelected: boolean;
  onToggle: (e: React.MouseEvent) => void;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, isSelected, onToggle }) => {
  return (
    <div 
      className={`p-3 border rounded-md cursor-pointer transition-colors ${
        isSelected 
          ? 'border-primary bg-primary/5' 
          : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
          isSelected ? 'bg-primary text-white' : 'border border-gray-300'
        }`}>
          {isSelected && <Check size={12} />}
        </div>
        
        <div className="flex-1">
          <p className="font-medium text-sm">{question.text}</p>
          <div className="flex items-center mt-1 gap-2">
            <Badge variant="outline" className="text-xs">
              Free Text
            </Badge>
          </div>
        </div>
        
        <ArrowRight size={16} className={`text-gray-400 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
      </div>
    </div>
  );
};

export default CustomQuestionsModal;
