
import React, { useEffect, useState } from 'react';
import { useQuestionStore } from '../../hooks/useQuestionStore';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { Archive, Edit, Plus } from 'lucide-react';
import QuestionModal from './QuestionModal';
import { CustomQuestion } from '../../types/customQuestions';
import { Badge } from '../ui/badge';
import { usePermissions } from '../../hooks/usePermissions';
import { toast } from 'sonner';

export default function QuestionsPage() {
  const { questions, isLoading, fetchQuestions, createQuestion, updateQuestion } = useQuestionStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<CustomQuestion | undefined>();
  const [showArchived, setShowArchived] = useState(false);
  const [canEditQuestions, setCanEditQuestions] = useState(false);
  const permissions = usePermissions();

  useEffect(() => {
    const loadQuestions = async () => {
      await fetchQuestions(showArchived);
    };
    loadQuestions();
  }, [showArchived]);

  useEffect(() => {
    const checkEditPermission = async () => {
      if (permissions && !permissions.isLoading) {
        const canEdit = await permissions.canEdit();
        setCanEditQuestions(canEdit);
      }
    };
    
    checkEditPermission();
  }, [permissions]);

  const handleCreate = async (questionData: Omit<CustomQuestion, 'id' | 'created_at' | 'archived' | 'creator_id'>) => {
    if (!canEditQuestions) {
      toast.error("You don't have permission to create questions");
      return;
    }
    
    await createQuestion(questionData);
    setModalOpen(false);
  };

  const handleEdit = async (questionData: Omit<CustomQuestion, 'id' | 'created_at' | 'archived' | 'creator_id'>) => {
    if (!canEditQuestions) {
      toast.error("You don't have permission to edit questions");
      return;
    }
    
    if (selectedQuestion) {
      await updateQuestion(selectedQuestion.id, questionData);
      setSelectedQuestion(undefined);
      setModalOpen(false);
    }
  };

  const handleArchive = async (question: CustomQuestion) => {
    if (!canEditQuestions) {
      toast.error("You don't have permission to archive questions");
      return;
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
          {canEditQuestions && (
            <Button
              onClick={() => {
                setSelectedQuestion(undefined);
                setModalOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Question
            </Button>
          )}
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No questions found. {canEditQuestions ? "Click 'Add Question' to create one." : "You don't have permission to create questions."}</p>
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
              <CardContent className="text-center py-6 flex items-center justify-center min-h-[80px]">
                <h3 className="font-semibold text-base">{question.text}</h3>
              </CardContent>
              {canEditQuestions && (
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
              )}
            </Card>
          ))}
        </div>
      )}

      {canEditQuestions && (
        <QuestionModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSave={selectedQuestion ? handleEdit : handleCreate}
          initialData={selectedQuestion}
        />
      )}
    </div>
  );
}
