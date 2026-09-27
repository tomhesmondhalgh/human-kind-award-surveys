export interface OnboardingInput {
  totalSurveys: number;
  hasLiveSurvey: boolean;
  totalRespondents: number;
}

export interface OnboardingProgress {
  createSurvey: boolean;
  shareSurvey: boolean;
  getResponses: boolean;
  percent: number;
}

/**
 * The three tracked steps of the Getting Started checklist. "Explore
 * resources" is a pointer only and doesn't count towards progress.
 */
export const getOnboardingProgress = ({
  totalSurveys,
  hasLiveSurvey,
  totalRespondents,
}: OnboardingInput): OnboardingProgress => {
  const getResponses = totalRespondents > 0;
  // Responses imply the survey was shared, and sharing implies it exists.
  const shareSurvey = hasLiveSurvey || getResponses;
  const createSurvey = totalSurveys > 0 || shareSurvey;
  const steps = [createSurvey, shareSurvey, getResponses];
  return {
    createSurvey,
    shareSurvey,
    getResponses,
    percent: Math.round((steps.filter(Boolean).length / steps.length) * 100),
  };
};
