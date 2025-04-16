
import React from 'react';

interface PageTitleProps {
  title: string;
  subtitle?: string;
  className?: string;
  alignment?: 'left' | 'center' | 'right';
}

const PageTitle: React.FC<PageTitleProps> = ({
  title,
  subtitle,
  className = '',
  alignment = 'left'
}) => {
  return (
    <div className={`${className}`}>
      <h1 className={`text-3xl font-bold text-gray-900 mb-2 text-${alignment}`}>
        {title}
      </h1>
      {subtitle && (
        <p className={`text-lg text-gray-600 text-${alignment}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default PageTitle;
