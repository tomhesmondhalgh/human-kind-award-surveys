
import React from 'react';
import { CalendarIcon, Share, Download } from "lucide-react";
import { format } from "date-fns";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";

interface SurveyControlsProps {
  surveyOptions: any[];
  selectedSurvey: string;
  selectedTimeRange: string;
  customDateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  exportLoading: boolean;
  onSurveyChange: (value: string) => void;
  onTimeRangeChange: (value: string) => void;
  onCustomDateRangeChange: (range: {
    from: Date | undefined;
    to: Date | undefined;
  }) => void;
  onExportReport: () => void;
  onExportPDF: () => void;
}

const SurveyControls: React.FC<SurveyControlsProps> = ({
  surveyOptions,
  selectedSurvey,
  selectedTimeRange,
  customDateRange,
  exportLoading,
  onSurveyChange,
  onTimeRangeChange,
  onCustomDateRangeChange,
  onExportReport,
  onExportPDF
}) => {
  return (
    <div className="mb-8 space-y-6">
      {/* Survey and Time Range Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Survey:</label>
          <Select value={selectedSurvey} onValueChange={onSurveyChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a survey" />
            </SelectTrigger>
            <SelectContent>
              {surveyOptions.map(option => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name} ({option.date})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Time Range:</label>
          <div className="flex flex-col space-y-2">
            <Select value={selectedTimeRange} onValueChange={onTimeRangeChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-time">All Time</SelectItem>
                <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                <SelectItem value="last-90-days">Last 90 Days</SelectItem>
                <SelectItem value="custom-range">Custom Date Range</SelectItem>
              </SelectContent>
            </Select>
            
            {selectedTimeRange === "custom-range" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      id="date-from" 
                      variant="outline" 
                      className={cn(
                        "w-full justify-start text-left font-normal", 
                        !customDateRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDateRange.from ? (
                        format(customDateRange.from, "PPP")
                      ) : (
                        <span>From date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar 
                      mode="single" 
                      selected={customDateRange.from} 
                      onSelect={date => onCustomDateRangeChange({
                        ...customDateRange,
                        from: date || undefined
                      })} 
                      initialFocus 
                    />
                  </PopoverContent>
                </Popover>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      id="date-to" 
                      variant="outline" 
                      className={cn(
                        "w-full justify-start text-left font-normal", 
                        !customDateRange.to && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDateRange.to ? (
                        format(customDateRange.to, "PPP")
                      ) : (
                        <span>To date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar 
                      mode="single" 
                      selected={customDateRange.to} 
                      onSelect={date => onCustomDateRangeChange({
                        ...customDateRange,
                        to: date || undefined
                      })} 
                      disabled={date => date < (customDateRange.from || new Date(0))} 
                      initialFocus 
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="flex flex-wrap gap-4 justify-start sm:justify-end">
        <Button 
          variant="outline" 
          className="py-2 px-4 text-sm text-gray-700 w-full sm:w-auto" 
          onClick={onExportReport} 
          disabled={exportLoading}
        >
          <Share className="h-4 w-4 mr-2" /> Export report
        </Button>
        <Button 
          variant="outline" 
          className="py-2 px-4 text-sm text-gray-700 w-full sm:w-auto" 
          onClick={onExportPDF} 
          disabled={exportLoading}
        >
          <Download className="h-4 w-4 mr-2" /> Download PDF
        </Button>
      </div>
    </div>
  );
};

export default SurveyControls;
