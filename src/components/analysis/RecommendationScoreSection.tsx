
import React from 'react';
import { Lock } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";

interface RecommendationScoreSectionProps {
  score: number;
  nationalAverage: number;
  hasAccess: boolean;
}

const RecommendationScoreSection: React.FC<RecommendationScoreSectionProps> = ({
  score,
  nationalAverage,
  hasAccess
}) => (
  <Card className="p-6 h-full">
    <h3 className="text-lg mb-4 font-semibold">Recommendation Score</h3>
    <div className="flex items-center justify-center space-x-12 h-52">
      <div className="text-center">
        <p className="text-4xl font-bold text-indigo-600">{score.toFixed(1)}</p>
        <p className="text-sm text-gray-500">Your score</p>
      </div>
      {hasAccess ? (
        <div className="text-center">
          <p className="text-4xl font-bold text-gray-500">{nationalAverage.toFixed(1)}</p>
          <p className="text-sm text-gray-500">National average</p>
        </div>
      ) : (
        <div className="text-center border border-gray-200 rounded-lg p-4 bg-gray-50">
          <Lock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700">National Average</p>
          <p className="text-xs text-gray-500 mt-1 mb-2">Available on Foundation plan or higher</p>
          <Button size="sm" variant="outline" onClick={() => window.location.href = '/upgrade'}>
            Upgrade
          </Button>
        </div>
      )}
    </div>
    <p className="text-xs text-gray-500 text-center mt-4">
      Average score for "How likely would you recommend this organization to others as a place to work?" (0-10)
    </p>
  </Card>
);

export default RecommendationScoreSection;
