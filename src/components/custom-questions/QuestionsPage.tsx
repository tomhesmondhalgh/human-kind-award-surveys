
import React, { useEffect, useState } from 'react';
import { useQuestionStore } from '../../hooks/useQuestionStore';
import { Button } from '../ui/button';
import { Plus, Eye, EyeOff, Archive } from 'lucide-react';
import QuestionModal from './QuestionModal';
import QuestionsList from './QuestionsList';
import { CustomQuestion } from '../../types/customQuestions';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '../ui/skeleton';
import Pagination from '../surveys/Pagination';

const QuestionsListSkeleton = () => {
  return (
    <div className="space-y-4">
      <div className="hidden md:block border rounded-lg overflow-hidden">
        <div className="bg-muted p-4 border-b">
          <div className="grid grid-cols-12 gap-4">
            <Skeleton className="h-4 w-24 col-span-5" />
            <Skeleton className="h-4 w-24 col-span-2" />
            <Skeleton className="h-4 w-16 col-span-2" />
            <Skeleton className="h-4 w-20 col-span-3" />
          </div>
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-4 border-b last:border-b-0">
            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-5">
                <Skeleton className="h-5 w-full max-w-md" />
              </div>
              <Skeleton className="h-6 w-24 rounded-full col-span-2" />
              <Skeleton className="h-4 w-16 col-span-2" />
              <div className="col-span-3 flex gap-2 justify-end">
                <Skeleton className="h-9 w-16" />
                <Skeleton className="h-9 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="md:hidden space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-lg p-4 space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-5 w-32" />
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 flex-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function QuestionsPage() {
  const { questions, isLoading, fetchQuestions, createQuestion, updateQuestion } = useQuestionStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<CustomQuestion | undefined>();
  const [showArchived, setShowArchived] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  const itemsPerPage = 10;
  const totalPages = Math.ceil(questions.length / itemsPerPage);
  const paginatedQuestions = questions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    const loadQuestions = async () => {
      await fetchQuestions(showArchived);
      setCurrentPage(1); // Reset to page 1 when toggling archive view
    };
    loadQuestions();
  }, [showArchived]);

  const handleCreate = async (questionData: Omit<CustomQuestion, 'id' | 'created_at' | 'archived' | 'creator_id'>) => {
    await createQuestion(questionData);
    setModalOpen(false);
  };

  const handleEdit = async (questionData: Omit<CustomQuestion, 'id' | 'created_at' | 'archived' | 'creator_id'>) => {
    if (selectedQuestion) {
      await updateQuestion(selectedQuestion.id, questionData);
      setSelectedQuestion(undefined);
      setModalOpen(false);
    }
  };

  const handleArchive = async (question: CustomQuestion) => {
    // Check usage before archiving
    if (!question.archived) {
      const { data: usageData } = await supabase
        .from('survey_questions')
        .select('survey_id')
        .eq('question_id', question.id);
      
      if (usageData && usageData.length > 0) {
        const confirmArchive = window.confirm(
          `This question is currently used in ${usageData.length} survey(s). Archiving it will not remove it from existing surveys, but it will not be available for new surveys. Continue?`
        );
        
        if (!confirmArchive) return;
      }
    }
    
    await updateQuestion(question.id, { archived: !question.archived });
  };

  const handleEditClick = (question: CustomQuestion) => {
    setSelectedQuestion(question);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Custom Questions</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage custom questions for your surveys
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedQuestion(undefined);
            setModalOpen(true);
          }}
          className="whitespace-nowrap"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Question
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setShowArchived(!showArchived);
          }}
          className="gap-2"
        >
          {showArchived ? (
            <>
              <EyeOff className="h-4 w-4" />
              Active Only
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              Show Archived
            </>
          )}
        </Button>
        {showArchived && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Showing all questions
          </p>
        )}
      </div>

      {isLoading ? (
        <QuestionsListSkeleton />
      ) : (
        <>
          <QuestionsList
            questions={paginatedQuestions}
            onEdit={handleEditClick}
            onArchive={handleArchive}
            showArchived={showArchived}
          />
          
          {!isLoading && questions.length > itemsPerPage && (
            <div className="flex justify-center mt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      )}

      <QuestionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSave={selectedQuestion ? handleEdit : handleCreate}
        initialData={selectedQuestion}
      />
    </div>
  );
}
