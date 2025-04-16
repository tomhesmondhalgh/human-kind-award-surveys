import React from 'react';
import { cn } from '../../lib/utils';
import { Slider } from '../ui/slider';
import { useIsMobile } from '../../hooks/use-mobile';
import { Check, Circle } from 'lucide-react';

interface RadioQuestionProps { 
  label: string; 
  name: string; 
  options: string[]; 
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
  useSlider?: boolean;
}

const RadioQuestion: React.FC<RadioQuestionProps> = ({ 
  label, 
  name, 
  options, 
  value,
  onChange,
  error,
  required = true,
  useSlider = false
}) => {
  const isMobile = useIsMobile();

  if (useSlider && options.every(opt => !isNaN(Number(opt)))) {
    const handleSliderChange = (newValue: number[]) => {
      const event = {
        target: {
          name,
          value: String(newValue[0])
        }
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(event);
    };

    const currentValue = value ? parseInt(value) : 0;
    const minValue = parseInt(options[0]);
    const maxValue = parseInt(options[options.length - 1]);

    return (
      <div className="mb-16">
        <fieldset>
          <legend className="text-lg font-medium mb-3 text-left">
            {label} {required && <span className="text-red-500" aria-hidden="true">*</span>}
            {required && <span className="sr-only"> (Required)</span>}
          </legend>
          <div className="px-2 md:px-4 py-6">
            <Slider 
              defaultValue={[currentValue]} 
              max={maxValue} 
              min={minValue} 
              step={1} 
              value={[currentValue]}
              onValueChange={handleSliderChange}
              className="mb-2"
              aria-label={`${label} scale from ${minValue} to ${maxValue}`}
            />
            <div className="flex justify-between mt-2">
              <div className="text-center text-sm text-gray-600">
                Not at all likely
              </div>
              <div className="text-center text-sm text-gray-600">
                Extremely Likely
              </div>
            </div>
            <div className="flex justify-between mt-2">
              {options.map((option) => (
                <div key={option} className="text-center">
                  <span className={cn(
                    "text-sm", 
                    value === option ? "font-bold text-brandPurple-600" : "text-gray-600"
                  )}>
                    {option}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {error && <p className="text-red-500 text-sm mt-1 text-left" aria-live="polite">{error}</p>}
        </fieldset>
      </div>
    );
  }

  return (
    <div className="mb-16">
      <fieldset>
        <legend className="text-lg font-medium mb-3 text-left">
          {label} {required && <span className="text-red-500" aria-hidden="true">*</span>}
          {required && <span className="sr-only"> (Required)</span>}
        </legend>
        <div className={cn(
          "flex flex-col sm:flex-row sm:flex-wrap gap-2 text-left",
          options.length <= 4 && "sm:grid sm:grid-cols-2 md:grid-cols-4"
        )}>
          {options.map((option) => (
            <div 
              key={option} 
              className={cn(
                "flex items-center p-3 md:p-4 rounded-md transition-all border",
                isMobile ? "min-h-[56px]" : "min-h-[48px]",
                value === option
                  ? "bg-brandPurple-100 border-brandPurple-400 shadow-sm" 
                  : "hover:bg-gray-50 border-gray-200",
                "relative cursor-pointer"
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
            >
              <div className="flex items-center">
                <input
                  type="radio"
                  id={`${name}-${option}`}
                  name={name}
                  value={option}
                  checked={value === option}
                  onChange={onChange}
                  className="sr-only"
                  aria-labelledby={`${name}-${option}-label`}
                  required={required}
                />
                {value === option ? (
                  <div className="flex-shrink-0 h-5 w-5 mr-2 text-brandPurple-600">
                    <Circle className="h-5 w-5 stroke-brandPurple-600 fill-brandPurple-600" />
                    <Check className="h-3 w-3 absolute top-[18px] left-[11px] stroke-white" />
                  </div>
                ) : (
                  <div className="flex-shrink-0 h-5 w-5 mr-2 text-gray-400">
                    <Circle className="h-5 w-5 stroke-gray-400 fill-transparent" />
                  </div>
                )}
                <label 
                  id={`${name}-${option}-label`} 
                  htmlFor={`${name}-${option}`} 
                  className="text-sm md:text-base text-gray-700 cursor-pointer whitespace-normal"
                >
                  {option}
                </label>
              </div>
            </div>
          ))}
        </div>
        {error && <p className="text-red-500 text-sm mt-1 text-left" aria-live="polite">{error}</p>}
      </fieldset>
    </div>
  );
};

export default RadioQuestion;
