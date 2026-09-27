import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { MIN_RESPONSES_TO_SHOW_RESULTS } from '@/lib/anonymity';

interface ResultsHiddenNoticeProps {
  responseCount: number;
  dateFiltered: boolean;
}

const ResultsHiddenNotice: React.FC<ResultsHiddenNoticeProps> = ({ responseCount, dateFiltered }) => (
  <Card className="max-w-2xl mx-auto my-8 border-2 border-dashed border-primary/30 bg-primary/5">
    <CardContent className="pt-8 pb-8 text-center">
      <div className="flex justify-center mb-4">
        <div className="p-4 bg-primary/10 rounded-full">
          <ShieldCheck className="h-10 w-10 text-primary" />
        </div>
      </div>
      <h2 className="text-xl font-semibold mb-3">Results aren't available yet</h2>
      <p className="text-muted-foreground mb-2">
        Results appear once at least {MIN_RESPONSES_TO_SHOW_RESULTS} colleagues have responded, to protect anonymity.
      </p>
      <p className="font-medium">
        {responseCount} {responseCount === 1 ? 'response' : 'responses'} so far
        {dateFiltered ? ' in the selected date range' : ''}.
      </p>
      {dateFiltered && (
        <p className="text-sm text-muted-foreground mt-2">
          Try a wider date range to include more responses.
        </p>
      )}
    </CardContent>
  </Card>
);

export default ResultsHiddenNotice;
