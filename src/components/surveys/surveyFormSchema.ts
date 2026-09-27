import * as z from 'zod';
import { isCloseDateOnOrAfterStart } from '@/utils/survey/closeDate';

export const surveyFormSchema = z.object({
  name: z.string()
    .trim()
    .min(1, { message: 'Survey name is required' })
    .min(3, { message: 'Survey name must be at least 3 characters' }),
  date: z.date({
    required_error: 'Survey date is required',
  }),
  closeDate: z.date().optional(),
  recipients: z.string().optional(),
  status: z.enum(['Saved', 'Scheduled', 'Sent', 'Completed', 'Archived']).optional(),
  distributionMethod: z.enum(['link', 'email']).default('link')
}).refine(
  (data) => !data.closeDate || isCloseDateOnOrAfterStart(data.date, data.closeDate),
  { message: 'Close date must be on or after the start date', path: ['closeDate'] }
);

export type SurveyFormData = z.infer<typeof surveyFormSchema>;
