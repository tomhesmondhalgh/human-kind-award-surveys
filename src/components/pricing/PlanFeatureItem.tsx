import React from 'react';
import { Check, Trophy } from 'lucide-react';

interface PlanFeatureItemProps {
  text: string;
  icon?: 'check' | 'trophy';
}

const PlanFeatureItem: React.FC<PlanFeatureItemProps> = ({ text, icon = 'check' }) => {
  return (
    <li className="flex items-start">
      {icon === 'check' ? (
        <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
      ) : (
        <Trophy className="h-5 w-5 text-yellow-500 mr-2 shrink-0 mt-0.5" />
      )}
      <span>{text}</span>
    </li>
  );
};

export default PlanFeatureItem;
