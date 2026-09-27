
import { supabase } from '@/integrations/supabase/client';
import type {
  DetailedQuestionResponse,
  LeavingContemplationData,
  TextResponse
} from './analysisUtils';

// The AI summary is only generated once a survey has at least this many responses.
export const MIN_RESPONSES_FOR_SUMMARY = 10;

// Types for the summary response
export interface SummaryData {
  introduction: string;
  strengths: string[];
  improvements: string[];
  insufficientData?: boolean;
  // The summary service failed; nothing should be shown in its place.
  unavailable?: boolean;
}

export const hasEnoughResponsesForSummary = (responseCount: number): boolean =>
  Number.isFinite(responseCount) && responseCount >= MIN_RESPONSES_FOR_SUMMARY;

const getInsufficientDataSummary = (): SummaryData => ({
  introduction: '',
  strengths: [],
  improvements: [],
  insufficientData: true
});

const getUnavailableSummary = (): SummaryData => ({
  introduction: '',
  strengths: [],
  improvements: [],
  unavailable: true
});

const toPercent = (value: number) => Math.round((Number(value) || 0) * 100);

const toPercentRecord = (values: Record<string, number> | undefined) =>
  Object.fromEntries(Object.entries(values ?? {}).map(([key, value]) => [key, toPercent(value)]));

// The summary function writes these values into its prompt with a "%" after
// them, so send whole percentages (0-100) rather than the 0-1 chart decimals.
export const buildSummaryRequestBody = (
  responseCount: number,
  recommendationScore: { score: number, nationalAverage: number },
  leavingContemplation: LeavingContemplationData,
  detailedResponses: DetailedQuestionResponse[],
  textResponses: { doingWell: TextResponse[], improvements: TextResponse[] }
) => ({
  responseCount,
  recommendationScore,
  leavingContemplation: Object.fromEntries(
    Object.entries(leavingContemplation.proportions).map(([option, share]) => [
      option,
      `${toPercent(share)}% (${leavingContemplation.counts[option] ?? 0} of ${leavingContemplation.total})`
    ])
  ),
  detailedResponses: detailedResponses.map(question => ({
    ...question,
    schoolResponses: toPercentRecord(question.schoolResponses),
    nationalResponses: toPercentRecord(question.nationalResponses)
  })),
  textResponses
});

// Function to get AI-generated summary of survey data
export const getSurveySummary = async (
  responseCount: number,
  recommendationScore: { score: number, nationalAverage: number },
  leavingContemplation: LeavingContemplationData,
  detailedResponses: DetailedQuestionResponse[],
  textResponses: { doingWell: TextResponse[], improvements: TextResponse[] }
): Promise<SummaryData> => {
  if (!hasEnoughResponsesForSummary(responseCount)) {
    return getInsufficientDataSummary();
  }

  try {
    const { data, error } = await supabase.functions.invoke('generate-survey-summary', {
      body: buildSummaryRequestBody(
        responseCount,
        recommendationScore,
        leavingContemplation,
        detailedResponses,
        textResponses
      )
    });

    if (error || !data) {
      console.error('Error generating survey summary:', error);
      return getUnavailableSummary();
    }

    if (data.insufficientData) {
      return getInsufficientDataSummary();
    }

    const strengths = Array.isArray(data.strengths) ? data.strengths.slice(0, 3) : [];
    const improvements = Array.isArray(data.improvements) ? data.improvements.slice(0, 3) : [];
    if (strengths.length === 0 && improvements.length === 0) {
      return getUnavailableSummary();
    }

    return { introduction: '', strengths, improvements };
  } catch (error) {
    console.error('Error calling generate-survey-summary:', error);
    return getUnavailableSummary();
  }
};
