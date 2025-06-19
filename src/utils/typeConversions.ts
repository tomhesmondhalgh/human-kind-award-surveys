
/**
 * Utility functions for converting between database and application types
 */

// Fix plan types in data from database
export const fixPlanTypes = (plans: any[]) => {
  return plans.map(plan => ({
    ...plan,
    price: Number(plan.price) || 0,
    sort_order: Number(plan.sort_order) || 0,
    duration_months: Number(plan.duration_months) || 0,
    is_popular: Boolean(plan.is_popular),
    is_active: Boolean(plan.is_active),
    features: Array.isArray(plan.features) ? plan.features : []
  }));
};

// Convert database custom question format to application type
export const fixCustomQuestionTypes = (questions: any[]) => {
  return questions.map(question => ({
    ...question,
    type: question.type || 'text',
    options: Array.isArray(question.options) ? question.options : [],
    archived: Boolean(question.archived)
  }));
};

// Convert organization members to application type
export const convertOrganizationMembers = (members: any[]) => {
  return members.map(member => ({
    ...member,
    is_primary: Boolean(member.is_primary),
    created_at: member.created_at || new Date().toISOString(),
    updated_at: member.updated_at || new Date().toISOString()
  }));
};

// Fix school search results type conversion
export const fixSchoolSearchResults = (schools: any[]) => {
  return schools.map(school => ({
    ...school,
    URN: String(school.URN),
    County: school["County (name)"] || ''
  }));
};

// Convert ActionPlanDescriptor from database to application type
export const convertActionPlanDescriptors = (descriptors: any[]) => {
  return descriptors.map(descriptor => ({
    ...descriptor,
    progress_notes_count: Number(descriptor.progress_notes_count) || 0,
    index_number: descriptor.index_number || '',
    status: descriptor.status || 'Not Started'
  }));
};

// Convert ProgressNote from database to application type
export const convertProgressNotes = (notes: any[]) => {
  return notes.map(note => ({
    ...note,
    note_date: note.note_date || new Date().toISOString(),
    created_at: note.created_at || new Date().toISOString()
  }));
};

// Convert SurveyWithResponses from database to application type
export const convertSurveyWithResponses = (surveys: any[]) => {
  return surveys.map(survey => ({
    ...survey,
    responses: Number(survey.responses) || 0,
    status: survey.status || 'Saved'
  }));
};
