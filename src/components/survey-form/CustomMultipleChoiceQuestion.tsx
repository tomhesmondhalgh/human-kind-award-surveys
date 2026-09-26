
import React from 'react';

interface CustomMultipleChoiceQuestionProps {
  label: string;
  name: string;
  options: string[];
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
}

const CustomMultipleChoiceQuestion: React.FC<CustomMultipleChoiceQuestionProps> = ({
  label,
  name,
  options,
  value,
  onChange,
  error,
  required = true
}) => (
  <div className="mb-10">
    <fieldset>
      <legend className="block text-lg font-medium mb-4 text-left">
        {label} {required && <span className="text-red-500">*</span>}
      </legend>
      <div className="space-y-3">
        {options.map((option, index) => (
          <div key={index} className="flex items-center">
            <input
              type="radio"
              id={`${name}_${index}`}
              name={name}
              value={option}
              checked={value === option}
              onChange={onChange}
              className="h-4 w-4 text-brandPurple-600 focus:ring-brandPurple-500 mr-2"
            />
            <label htmlFor={`${name}_${index}`} className="text-gray-700">
              {option}
            </label>
          </div>
        ))}
      </div>
      {error && <p className="text-red-500 text-sm mt-1 text-left">{error}</p>}
    </fieldset>
  </div>
);

export default CustomMultipleChoiceQuestion;
