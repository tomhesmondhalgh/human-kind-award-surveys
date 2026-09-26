import React from 'react';
import { BarChart3, TrendingUp, FileText, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const EmptyAnalysisState = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-8">
      {/* Main CTA Card */}
      <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <BarChart3 className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h2 className="text-2xl font-semibold mb-3">
            Select a Survey to View Analysis
          </h2>
          <p className="text-muted-foreground text-lg mb-6 max-w-2xl mx-auto">
            Choose a survey from the dropdown above to view detailed insights, recommendation scores, 
            and staff feedback analysis.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4" />
            <span>Analysis is available for surveys with at least one response</span>
          </div>
        </CardContent>
      </Card>

      {/* Feature Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6 pb-6 text-center">
            <div className="flex justify-center mb-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <TrendingUp className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <h3 className="font-semibold mb-2">Recommendation Scores</h3>
            <p className="text-sm text-muted-foreground">
              Track how likely staff are to recommend your organisation as a place to work
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 pb-6 text-center">
            <div className="flex justify-center mb-3">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                <BarChart3 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h3 className="font-semibold mb-2">Wellbeing Charts</h3>
            <p className="text-sm text-muted-foreground">
              Visualise responses to key wellbeing questions with interactive charts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 pb-6 text-center">
            <div className="flex justify-center mb-3">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                <FileText className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <h3 className="font-semibold mb-2">Text Responses</h3>
            <p className="text-sm text-muted-foreground">
              Read detailed feedback from staff about what's working and what needs improvement
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmptyAnalysisState;
