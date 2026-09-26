
import React from 'react';
import { cn } from '../../lib/utils';

interface RatingQuestionProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  error?: string | undefined;
}

const RatingQuestion: React.FC<RatingQuestionProps> = ({
  label,
  name,
  value,
  onChange,
  required = true,
  error
}) => {
  const options = ['Strongly Disagree', 'Disagree', 'Agree', 'Strongly Agree'];
  const hasError = !!error;

  return (
    <div className="mb-16">
      <fieldset className={hasError ? 'has-error' : ''}>
        <legend className={cn(
          "text-lg font-medium mb-3 text-left",
          hasError && "text-red-600"
        )}>
          {label} {required && <span className="text-red-500">*</span>}
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-center">
          {options.map((option) => (
            <div 
              key={option} 
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-md transition-all border cursor-pointer",
                value === option
                  ? "bg-brandPurple-100 border-brandPurple-400 shadow-sm" 
                  : error 
                    ? "hover:bg-gray-50 border-red-500" 
                    : "hover:bg-gray-50 border-gray-200",
                "hover:shadow-sm"
              )}
              onClick={() => {
                const event = {
                  target: {
                    name,
                    value: option
                  }
                } as React.ChangeEvent<HTMLInputElement>;
                onChange(event);
              }}
              aria-invalid={hasError ? 'true' : 'false'}
            >
              <input
                type="radio"
                id={`${name}-${option}`}
                name={name}
                value={option}
                checked={value === option}
                onChange={onChange}
                className="h-4 w-4 text-brandPurple-600 focus:ring-brandPurple-500 border-gray-300 sr-only"
                required={required}
                aria-invalid={hasError ? 'true' : 'false'}
              />
              <label htmlFor={`${name}-${option}`} className="text-sm text-gray-700 cursor-pointer whitespace-normal text-center">
                {option}
              </label>
            </div>
          ))}
        </div>
        {error && (
          <p className="text-red-500 text-sm mt-1" role="alert">{error}</p>
        )}
      </fieldset>
    </div>
  );
};

export default RatingQuestion;
