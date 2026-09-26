
export interface CustomQuestion {
  id: string;
  text: string;
  type: 'text' | 'multiple_choice';
  options?: string[] | null;
  created_at: string;
  archived: boolean;
  creator_id: string;
  organization_id?: string | null;
}

export interface CustomQuestionResponse {
  id: string;
  question_id: string;
  response_id: string;
  answer: string;
  created_at: string;
}

// Database types that might come from Supabase
export interface DbCustomQuestion {
  id: string;
  text: string;
  type: string;
  options?: string[] | null;
  created_at: string;
  archived?: boolean;
  creator_id: string;
  organization_id?: string | null;
}

// Utility functions to convert database types to our frontend types
export const convertToCustomQuestion = (dbQuestion: DbCustomQuestion): CustomQuestion => {
  return {
    id: dbQuestion.id,
    text: dbQuestion.text,
    type: dbQuestion.type === 'multiple_choice' ? 'multiple_choice' : 'text',
    options: dbQuestion.options,
    created_at: dbQuestion.created_at,
    archived: dbQuestion.archived ?? false,
    creator_id: dbQuestion.creator_id,
    organization_id: dbQuestion.organization_id
  };
};

export const convertToCustomQuestions = (dbQuestions: DbCustomQuestion[]): CustomQuestion[] => {
  return dbQuestions.map(convertToCustomQuestion);
};
