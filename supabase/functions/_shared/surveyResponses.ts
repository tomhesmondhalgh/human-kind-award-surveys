// Pure helpers for submit-survey-response. No Deno imports so Vitest can test them.

export interface CustomAnswer {
  question_id: string;
  answer: string;
}

// Keeps only answers to questions that are on this survey, one per question
// (the first). Anything else is dropped rather than failing the whole
// submission, so a respondent never loses their answers because a question
// was removed while they were filling the form in.
export function answersForSurvey<T extends CustomAnswer>(
  answers: T[],
  surveyQuestionIds: Iterable<string>,
): { kept: T[]; dropped: T[] } {
  const allowed = new Set(surveyQuestionIds);
  const seen = new Set<string>();
  const kept: T[] = [];
  const dropped: T[] = [];
  for (const answer of answers) {
    if (allowed.has(answer.question_id) && !seen.has(answer.question_id)) {
      seen.add(answer.question_id);
      kept.push(answer);
    } else {
      dropped.push(answer);
    }
  }
  return { kept, dropped };
}
