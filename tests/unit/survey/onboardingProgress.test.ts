import { describe, it, expect } from 'vitest';
import { getOnboardingProgress } from '@/components/dashboard/onboardingProgress';

describe('getOnboardingProgress', () => {
  it('is empty for a brand-new school', () => {
    expect(getOnboardingProgress({ totalSurveys: 0, hasLiveSurvey: false, totalRespondents: 0 }))
      .toEqual({ createSurvey: false, shareSurvey: false, getResponses: false, percent: 0 });
  });

  it('marks only the first step for a saved draft', () => {
    const p = getOnboardingProgress({ totalSurveys: 1, hasLiveSurvey: false, totalRespondents: 0 });
    expect(p.createSurvey).toBe(true);
    expect(p.shareSurvey).toBe(false);
    expect(p.percent).toBe(33);
  });

  it('marks sharing once a survey is live', () => {
    expect(getOnboardingProgress({ totalSurveys: 1, hasLiveSurvey: true, totalRespondents: 0 }).percent).toBe(67);
  });

  it('is complete once responses arrive', () => {
    expect(getOnboardingProgress({ totalSurveys: 1, hasLiveSurvey: true, totalRespondents: 4 }).percent).toBe(100);
  });
});
