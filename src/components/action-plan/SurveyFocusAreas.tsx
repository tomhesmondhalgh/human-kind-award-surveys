import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Target } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SectionSurveyScores } from '@/hooks/useSectionSurveyScores';
import { MIN_RESPONSES_FOR_SECTION_SCORES } from '@/utils/surveyFramework';

interface SurveyFocusAreasProps {
  data: SectionSurveyScores | null | undefined;
  isLoading: boolean;
  isError: boolean;
  onOpenSection: (sectionKey: string) => void;
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

const SurveyFocusAreas: React.FC<SurveyFocusAreasProps> = ({ data, isLoading, isError, onOpenSection }) => {
  if (isLoading || isError) return null;

  if (!data) {
    return (
      <Card className="p-6 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <BarChart3 className="h-8 w-8 text-brandPurple-600 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold text-lg">See where to focus</h3>
          <p className="text-sm text-gray-600">
            Once a staff survey has at least {MIN_RESPONSES_FOR_SECTION_SCORES} responses, we'll show how staff rated
            each area of the framework here and suggest where to start.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/surveys">Run a survey</Link>
        </Button>
      </Card>
    );
  }

  const focus = data.focusAreas
    .map((key) => data.scores.find((s) => s.sectionKey === key))
    .filter((s): s is NonNullable<typeof s> => !!s);

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-start gap-3 mb-4">
        <Target className="h-6 w-6 text-brandPurple-600 flex-shrink-0 mt-1" />
        <div>
          <h3 className="font-semibold text-lg">Suggested focus areas</h3>
          <p className="text-sm text-gray-600">
            Based on "{data.survey.name}" ({formatDate(data.survey.date)}, {data.survey.responseCount} responses).
            Scores show the % of staff who agreed or strongly agreed.
          </p>
        </div>
      </div>

      {focus.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {focus.map((s) => (
            <Button key={s.sectionKey} size="sm" onClick={() => onOpenSection(s.sectionKey)}>
              {s.title}: {s.score}%
            </Button>
          ))}
        </div>
      )}

      <ul className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
        {data.scores.map((s) => {
          const isFocus = data.focusAreas.includes(s.sectionKey);
          return (
            <li key={s.sectionKey}>
              <button
                type="button"
                onClick={() => onOpenSection(s.sectionKey)}
                className={`w-full flex justify-between px-3 py-2 rounded border text-left hover:bg-gray-50 ${
                  isFocus ? 'border-brandPurple-400 bg-brandPurple-50' : 'border-gray-200'
                }`}
              >
                <span>{s.title}</span>
                <span className="font-medium">{s.score === null ? 'n/a' : `${s.score}%`}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
};

export default SurveyFocusAreas;
