import { endOfDay, startOfDay, subDays } from 'date-fns';

export type AnalysisTimeRange = 'all-time' | 'last-30-days' | 'last-90-days' | 'custom-range';

export interface AnalysisDateRange {
  startDate?: string;
  endDate?: string;
}

// Turns the Analysis time-range picker into full ISO timestamps for filtering
// survey_responses.created_at. Days are the user's local days: the start is
// 00:00:00.000 local and the end is 23:59:59.999 local, so the chosen end day is
// included and British Summer Time doesn't shift the range by a day.
export const buildAnalysisDateRange = (
  timeRange: string,
  customRange: { from?: Date; to?: Date } = {},
  now: Date = new Date()
): AnalysisDateRange => {
  switch (timeRange) {
    case 'last-30-days':
      return { startDate: startOfDay(subDays(now, 30)).toISOString() };
    case 'last-90-days':
      return { startDate: startOfDay(subDays(now, 90)).toISOString() };
    case 'custom-range': {
      const range: AnalysisDateRange = {};
      if (customRange.from) range.startDate = startOfDay(customRange.from).toISOString();
      if (customRange.to) range.endDate = endOfDay(customRange.to).toISOString();
      return range;
    }
    default:
      return {};
  }
};
