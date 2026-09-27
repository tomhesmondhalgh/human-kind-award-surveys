
import React from 'react';
import { BarChart, Calendar, Users, Send } from 'lucide-react';
import StatsCard from './StatsCard';

interface StatsGridProps {
  totalSurveys: number | null;
  totalRespondents: number | null;
  responseRate: string | null;
  benchmarkScore: string | null;
  isLoading: boolean;
}

const StatsGrid = ({ totalSurveys, totalRespondents, responseRate, benchmarkScore, isLoading }: StatsGridProps) => {
  const statsData = !isLoading ? [
    { 
      label: 'Total Surveys', 
      value: totalSurveys?.toString() || '0', 
      icon: Calendar, 
      color: 'bg-green-100 text-green-600',
      link: '/surveys'
    },
    { 
      label: 'Total Respondents', 
      value: totalRespondents?.toString() || '0', 
      icon: Users, 
      color: 'bg-blue-100 text-blue-600',
      link: null
    },
    { 
      label: 'Response Rate', 
      value: responseRate || '0%', 
      icon: Send, 
      color: 'bg-purple-100 text-purple-600',
      link: null
    },
    { 
      label: 'Avg. recommendation score', 
      value: benchmarkScore ? `${benchmarkScore}/10` : '0/10', 
      icon: BarChart, 
      color: 'bg-amber-100 text-amber-600',
      link: null
    },
  ] : [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="card p-6 animate-pulse">
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
      {statsData.map((stat, index) => (
        <StatsCard
          key={index}
          label={stat.label}
          value={stat.value}
          icon={stat.icon}
          color={stat.color}
          link={stat.link}
          delay={index * 100}
        />
      ))}
    </div>
  );
};

export default StatsGrid;
