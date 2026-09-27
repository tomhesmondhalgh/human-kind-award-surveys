import React from 'react';

interface SurveyProgressProps {
  answered: number;
  total: number;
}

// Slim bar showing how many required questions are answered. Sticks to the
// top of the screen while scrolling.
const SurveyProgress: React.FC<SurveyProgressProps> = ({ answered, total }) => {
  if (total === 0) return null;
  const percent = Math.round((answered / total) * 100);

  return (
    <div className="sticky top-0 z-10 -mx-6 md:-mx-8 mb-4 px-6 md:px-8 py-3 bg-white/95 backdrop-blur border-b border-purple-100">
      <div className="flex justify-between text-sm text-gray-600 mb-1">
        <span>Your progress</span>
        <span>{answered} of {total} required questions answered</span>
      </div>
      <div
        className="h-2 w-full rounded-full bg-purple-100 overflow-hidden"
        role="progressbar"
        aria-label="Required questions answered"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={answered}
      >
        <div
          className="h-full rounded-full bg-brandPurple-600 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

export default SurveyProgress;
