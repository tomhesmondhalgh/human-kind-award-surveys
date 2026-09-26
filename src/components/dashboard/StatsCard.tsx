
import React from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
  link: string | null;
  delay: number;
}

const StatsCard = ({ label, value, icon: Icon, color, link, delay }: StatsCardProps) => {
  const StatContent = () => (
    <div className="flex items-center">
      <div className={`p-3 rounded-full mr-4 ${color}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <h3 className="text-2xl font-bold text-gray-900">
          {value === '0' ? '—' : value}
        </h3>
      </div>
    </div>
  );

  return (
    <div 
      className={`card p-6 hover:translate-y-[-4px] animate-slide-up ${link ? 'cursor-pointer hover:shadow-md transition-all' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {link ? (
        <Link to={link} className="block w-full h-full">
          <StatContent />
        </Link>
      ) : (
        <StatContent />
      )}
    </div>
  );
};

export default StatsCard;
