import React, { useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { SurveyWithResponses } from '../../utils/surveyUtils';
import { getSurveyStatus } from '../../utils/survey/status';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Eye, BarChart3, Send, Archive, Trash2 } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Card } from "@/components/ui/card";
import { toast } from 'sonner';

interface SurveyListProps {
  surveys: SurveyWithResponses[];
  refreshList: () => void;
}

const SurveyList: React.FC<SurveyListProps> = ({ surveys, refreshList }) => {
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [isDeleting, setIsDeleting] = useState(false);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  const handleViewAnalysis = (surveyId: string) => {
    navigate(`/analysis?surveyId=${surveyId}`);
  };

  const handleEditSurvey = (surveyId: string) => {
    navigate(`/surveys/edit?id=${surveyId}`);
  };

  const handlePreviewSurvey = (surveyId: string) => {
    navigate(`/survey-form?id=${surveyId}&preview=true`);
  };

  const handleSendSurvey = (surveyId: string) => {
    navigate(`/surveys/edit?id=${surveyId}`);
  };

  const handleArchiveSurvey = async (surveyId: string) => {
    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('survey_templates')
        .update({ status: 'Archived' })
        .eq('id', surveyId);

      if (error) {
        throw error;
      }

      toast.success('Survey archived successfully');
      refreshList();
    } catch (error) {
      console.error('Error archiving survey:', error);
      toast.error('Failed to archive survey');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSurvey = async (surveyId: string) => {
    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('survey_templates')
        .delete()
        .eq('id', surveyId);

      if (error) {
        throw error;
      }

      toast.success('Survey deleted successfully');
      refreshList();
    } catch (error) {
      console.error('Error deleting survey:', error);
      toast.error('Failed to delete survey');
    } finally {
      setIsDeleting(false);
    }
  };

  const renderDropdownMenu = (survey: SurveyWithResponses) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleViewAnalysis(survey.id)}>
          <BarChart3 className="mr-2 h-4 w-4" />
          View Analysis
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleEditSurvey(survey.id)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Survey
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handlePreviewSurvey(survey.id)}>
          <Eye className="mr-2 h-4 w-4" />
          Preview
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSendSurvey(survey.id)}>
          <Send className="mr-2 h-4 w-4" />
          Send
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleArchiveSurvey(survey.id)}>
          <Archive className="mr-2 h-4 w-4" />
          Archive
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDeleteSurvey(survey.id)} disabled={isDeleting}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (!isMobile) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Survey</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Responses</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {surveys.map((survey) => {
            const status = getSurveyStatus(survey.date, survey.close_date);

            return (
              <TableRow key={survey.id}>
                <TableCell className="font-medium">{survey.name}</TableCell>
                <TableCell>{formatDate(survey.date)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{status}</Badge>
                </TableCell>
                <TableCell>{survey.responses}</TableCell>
                <TableCell className="text-right">
                  {renderDropdownMenu(survey)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {surveys.map((survey) => {
        const status = getSurveyStatus(survey.date, survey.close_date);

        return (
          <Card key={survey.id} className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">{survey.name}</h3>
                <Badge variant="outline">{status}</Badge>
              </div>
              <p className="text-gray-600 mt-2">Date: {formatDate(survey.date)}</p>
              <p className="text-gray-600">Responses: {survey.responses}</p>
              <div className="mt-4 flex justify-end">
                {renderDropdownMenu(survey)}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default SurveyList;
