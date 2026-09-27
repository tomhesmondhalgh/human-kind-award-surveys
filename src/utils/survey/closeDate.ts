import { differenceInCalendarDays, endOfDay, format, startOfDay } from 'date-fns';

/**
 * A survey that closes "on the 10th" should accept responses all day on the
 * 10th, so the stored close_date is the last millisecond of that local day.
 * The database treats a survey as open while close_date > now().
 */
export const toEndOfLocalDay = (date: Date): Date => endOfDay(date);

/** True when the close date is on or after the start date (calendar days). */
export const isCloseDateOnOrAfterStart = (start: Date, close: Date): boolean =>
  startOfDay(close).getTime() >= startOfDay(start).getTime();

export interface CloseDateDisplay {
  text: string;
  className: string;
}

export const getCloseDateDisplay = (
  closeDate?: string | null,
  now: Date = new Date()
): CloseDateDisplay => {
  if (!closeDate) return { text: 'No close date', className: 'text-muted-foreground' };

  const date = new Date(closeDate);
  if (Number.isNaN(date.getTime())) {
    return { text: 'No close date', className: 'text-muted-foreground' };
  }

  if (date.getTime() <= now.getTime()) {
    return { text: `Closed ${format(date, 'dd/MM/yyyy')}`, className: 'text-muted-foreground' };
  }

  const daysUntilClose = differenceInCalendarDays(date, now);

  if (daysUntilClose === 0) {
    return { text: 'Closes today', className: 'text-red-600 font-medium' };
  }
  if (daysUntilClose <= 3) {
    return {
      text: `Closes ${format(date, 'dd/MM/yyyy')} (${daysUntilClose} ${daysUntilClose === 1 ? 'day' : 'days'})`,
      className: 'text-orange-600 font-medium',
    };
  }
  if (daysUntilClose <= 7) {
    return { text: `Closes ${format(date, 'dd/MM/yyyy')}`, className: 'text-yellow-700 font-medium' };
  }
  return { text: `Closes ${format(date, 'dd/MM/yyyy')}`, className: 'text-foreground' };
};
