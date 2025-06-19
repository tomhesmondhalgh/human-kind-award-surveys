import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from "zod";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CalendarIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { fixCustomQuestionTypes } from '../utils/typeConversions';

const FormSchema = z.object({
  name: z.string().min(2, {
    message: "Survey name must be at least 2 characters.",
  }),
  date: z.date(),
  closeDate: z.date().optional(),
  recipients: z.string().optional(),
  status: z.enum(['Saved', 'Scheduled', 'Sent', 'Completed', 'Archived']).optional(),
  distributionMethod: z.enum(['link', 'email']),
})

export interface SurveyFormData {
  name: string;
  date: Date;
  closeDate?: Date;
  recipients?: string;
  status?: 'Saved' | 'Scheduled' | 'Sent' | 'Completed' | 'Archived';
  distributionMethod: 'link' | 'email';
}

interface SurveyFormProps {
  initialData?: SurveyFormData | null;
  onSubmit: (data: SurveyFormData, selectedCustomQuestionIds: string[]) => Promise<void>;
  submitButtonText: string;
  isEdit?: boolean;
  surveyId?: string;
  isSubmitting?: boolean;
  initialCustomQuestionIds?: string[];
  onPreviewSurvey?: () => void;
  onSendSurvey?: () => void;
}

const SurveyForm: React.FC<SurveyFormProps> = ({ 
  initialData, 
  onSubmit, 
  submitButtonText, 
  isEdit = false, 
  surveyId, 
  isSubmitting = false,
  initialCustomQuestionIds = [],
  onPreviewSurvey,
  onSendSurvey
}) => {
  const { user } = useAuth();
  const [customQuestions, setCustomQuestions] = useState<any[]>([]);
  const [selectedCustomQuestionIds, setSelectedCustomQuestionIds] = useState<string[]>(initialCustomQuestionIds);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const navigate = useNavigate();

  const form = useForm<SurveyFormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: initialData?.name || "",
      date: initialData?.date || new Date(),
      closeDate: initialData?.closeDate,
      recipients: initialData?.recipients || "",
      status: initialData?.status || 'Saved',
      distributionMethod: initialData?.distributionMethod || 'link',
    },
    mode: "onChange"
  })

  const { control, handleSubmit, watch, formState: { isValid } } = form;
  const distributionMethod = watch("distributionMethod");

  useEffect(() => {
    const fetchCustomQuestions = async () => {
      try {
        setIsLoadingQuestions(true);
        
        const { data, error } = await supabase
          .from('custom_questions')
          .select('*')
          .eq('creator_id', user?.id || '')
          .eq('archived', false)
          .order('created_at', { ascending: false });
      
        if (error) {
          throw error;
        }
        
        setCustomQuestions(fixCustomQuestionTypes(data || []));
        
      } catch (error) {
        console.error('Error fetching custom questions:', error);
        toast.error('Failed to load custom questions');
      } finally {
        setIsLoadingQuestions(false);
      }
    };

    fetchCustomQuestions();
  }, [user?.id]);

  const handleCheckboxChange = (questionId: string) => {
    setSelectedCustomQuestionIds(prevIds => {
      if (prevIds.includes(questionId)) {
        return prevIds.filter(id => id !== questionId);
      } else {
        return [...prevIds, questionId];
      }
    });
  };

  const onSubmitHandler = async (data: SurveyFormData) => {
    await onSubmit(data, selectedCustomQuestionIds);
  };

  return (
    <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-4">
      <div>
        <Label htmlFor="name">Survey Name</Label>
        <Input id="name" placeholder="Survey Name" {...form.register("name")} />
        {form.formState.errors.name && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message}</p>
        )}
      </div>
      <div>
        <Label>Distribution Method</Label>
        <div className="flex items-center space-x-4 mt-2">
          <div className="flex items-center space-x-2">
            <Controller
              control={control}
              name="distributionMethod"
              render={({ field }) => (
                <Button
                  variant={field.value === "link" ? "default" : "outline"}
                  onClick={() => field.onChange("link")}
                  type="button"
                >
                  Link
                </Button>
              )}
            />
            <span>Shareable Link</span>
          </div>
          <div className="flex items-center space-x-2">
            <Controller
              control={control}
              name="distributionMethod"
              render={({ field }) => (
                <Button
                  variant={field.value === "email" ? "default" : "outline"}
                  onClick={() => field.onChange("email")}
                  type="button"
                >
                  Email
                </Button>
              )}
            />
            <span>Email to Recipients</span>
          </div>
        </div>
      </div>
      {distributionMethod === "email" && (
        <div>
          <Label htmlFor="recipients">Recipient Email Addresses (comma-separated)</Label>
          <Input 
            id="recipients" 
            placeholder="email1@example.com, email2@example.com" 
            {...form.register("recipients")} 
          />
        </div>
      )}
      <div>
        <Label htmlFor="date">Start Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[240px] justify-start text-left font-normal",
                !form.getValues("date") && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {form.getValues("date") ? (
                new Date(form.getValues("date")).toLocaleDateString("en-GB", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              ) : (
                <span>Pick a date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={form.getValues("date")}
              onSelect={(date) => form.setValue("date", date || new Date())}
              disabled={(date) =>
                date < new Date()
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      <div>
        <Label htmlFor="closeDate">Close Date (Optional)</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[240px] justify-start text-left font-normal",
                !form.getValues("closeDate") && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {form.getValues("closeDate") ? (
                new Date(form.getValues("closeDate")).toLocaleDateString("en-GB", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              ) : (
                <span>Pick a date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={form.getValues("closeDate")}
              onSelect={(date) => form.setValue("closeDate", date)}
              disabled={(date) =>
                date < new Date()
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      {isEdit && (
        <div>
          <Label htmlFor="status">Status</Label>
          <Select defaultValue={initialData?.status || 'Saved'} onValueChange={(value) => form.setValue("status", value as any)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Saved">Saved</SelectItem>
              <SelectItem value="Scheduled">Scheduled</SelectItem>
              <SelectItem value="Sent">Sent</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <div>
        <Label>Custom Questions</Label>
        {isLoadingQuestions ? (
          <p>Loading custom questions...</p>
        ) : (
          <ScrollArea className="rounded-md border p-4 h-[200px] w-full">
            <div className="space-y-2">
              {customQuestions.map((question) => (
                <div key={question.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`question-${question.id}`}
                    checked={selectedCustomQuestionIds.includes(question.id)}
                    onCheckedChange={() => handleCheckboxChange(question.id)}
                  />
                  <Label htmlFor={`question-${question.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
                    {question.question_text}
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
      <div className="flex justify-between items-center">
        <div>
          {isEdit && onPreviewSurvey && (
            <Button type="button" variant="secondary" onClick={onPreviewSurvey}>
              Preview Survey
            </Button>
          )}
          {isEdit && onSendSurvey && (
            <Button type="button" variant="destructive" onClick={onSendSurvey} disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Survey'}
            </Button>
          )}
        </div>
        <Button type="submit" disabled={!isValid || isSubmitting}>
          {isSubmitting ? 'Saving...' : submitButtonText}
        </Button>
      </div>
    </form>
  );
};

export default SurveyForm;
