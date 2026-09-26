
import { CustomQuestion } from '../types/customQuestions';

export const toValidQuestionType = (type: string): 'text' | 'multiple_choice' => {
  if (type === 'multiple_choice') {
    return 'multiple_choice';
  }
  return 'text';
};

export const createDbQuestionPayload = (
  question: Partial<CustomQuestion>,
  organizationId?: string
): Omit<CustomQuestion, 'id' | 'created_at' | 'archived' | 'creator_id'> => {
  return {
    text: question.text || '',
    type: toValidQuestionType(question.type || 'text'),
    options: question.options || null,
    organization_id: organizationId || null
  };
};
