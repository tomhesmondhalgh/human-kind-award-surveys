
import React, { useEffect, useState } from 'react';
import { useQuestionStore } from '../../hooks/useQuestionStore';
import { useQuestionUsage } from '../../hooks/useQuestionUsage';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { Archive, Edit, Plus, FileText } from 'lucide-react';
import QuestionModal from './QuestionModal';
import { CustomQuestion } from '../../types/customQuestions';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function QuestionsPage() {
  const { questions, isLoading, fetchQuestions, createQuestion, updateQuestion } = useQuestionStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<CustomQuestion | undefined>();
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    const loadQuestions = async () => {
      await fetchQuestions(showArchived);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p>Loading questions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Custom Questions</h1>
        <div className="space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? 'Hide Archived' : 'Show Archived'}
          </Button>
          <Button
            onClick={() => {
              setSelectedQuestion(undefined);
              setModalOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Question
          </Button>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No questions found. Click 'Add Question' to create one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {questions.map((question) => (
            <Card key={question.id} className={question.archived ? 'opacity-60' : ''}>
              <CardHeader className="text-center pb-2">
                <Badge variant="outline" className="w-fit mx-auto bg-brandPurple-400 text-white border-none">
                  {question.type === 'text' ? 'Free Text' : 'Multiple Choice'}
                </Badge>
                {question.archived && (
                  <Badge variant="outline" className="w-fit mx-auto mt-2">
                    Archived
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="text-center py-6 flex flex-col items-center justify-center min-h-[80px]">
                <h3 className="font-semibold text-base mb-2">{question.text}</h3>
                <QuestionUsageBadge questionId={question.id} />
              </CardContent>
              <CardFooter className="flex justify-center space-x-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedQuestion(question);
                    setModalOpen(true);
                  }}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleArchive(question)}
                >
                  <Archive className="h-4 w-4 mr-1" />
                  {question.archived ? 'Unarchive' : 'Archive'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
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

interface QuestionUsageBadgeProps {
  questionId: string;
}

const QuestionUsageBadge: React.FC<QuestionUsageBadgeProps> = ({ questionId }) => {
  const { usage, isLoading } = useQuestionUsage(questionId);
  
  if (isLoading) return null;
  
  if (!usage || usage.surveyCount === 0) {
    return (
      <p className="text-xs text-muted-foreground">Not used in any surveys</p>
    );
  }
  
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <FileText className="h-3 w-3" />
      <span>Used in {usage.surveyCount} {usage.surveyCount === 1 ? 'survey' : 'surveys'}</span>
    </div>
  );
};
