
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
  const alignmentClass = alignment === 'center' ? 'text-center' : alignment === 'right' ? 'text-right' : 'text-left';

  return (
    <div className={`mb-8 ${className}`}>
      <h1 className={`text-3xl font-bold text-gray-900 mb-2 ${alignmentClass}`}>
        {title}
      </h1>
      {subtitle && (
        <p className={`text-lg text-gray-600 ${alignmentClass}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default PageTitle;
