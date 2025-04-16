import React from 'react';
import { cn } from '../../lib/utils';

interface TextQuestionProps { 
  label: string; 
  name: string; 
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  subtitle?: string;
  error?: string;
  required?: boolean;
}

const TextQuestion: React.FC<TextQuestionProps> = ({ 
  label, 
  name, 
  value,
  onChange,
  subtitle,
  error,
  required = true 
}) => (
  <div className="mb-16">
    <label htmlFor={name} className="block text-lg font-medium mb-2 text-left">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {subtitle && <p className="text-sm text-gray-600 mb-2 text-left">{subtitle}</p>}
    <textarea
      id={name}
      name={name}
      rows={4}
      value={value}
      onChange={onChange}
      className={cn(
        "w-full px-4 py-3 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brandPurple-500 focus:border-transparent transition-colors",
        error ? "border-red-500" : "border-purple-200 hover:border-purple-300"
      )}
      placeholder="Type your answer here..."
    />
    {error && <p className="text-red-500 text-sm mt-1 text-left">{error}</p>}
  </div>
);

export default TextQuestion;
