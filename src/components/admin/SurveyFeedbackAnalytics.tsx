
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Loader2, AlertTriangle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Progress } from "../ui/progress";
import { Button } from "../ui/button";
import { useSurveyFeedbackAnalytics } from "@/hooks/useSurveyFeedbackAnalytics";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

const SurveyFeedbackAnalytics = () => {
  const [threshold, setThreshold] = useState(5);
  const { analytics, isLoading, error, refresh } = useSurveyFeedbackAnalytics(threshold);
  
  const getSentimentColor = (score: number) => {
    if (score >= 8) return "text-green-500";
    if (score >= 6) return "text-yellow-500";
    return "text-red-500";
  };
  
  const getFeedbackSeverity = (ratio: number) => {
    if (ratio > 50) return ["high", "destructive"];
    if (ratio > 30) return ["medium", "warning"];
    return ["low", "outline"];
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Survey Feedback Analytics</CardTitle>
        <CardDescription>
          Schools with potential wellbeing concerns based on survey responses
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm">Minimum responses:</span>
            <Select
              value={threshold.toString()}
              onValueChange={(value) => setThreshold(parseInt(value))}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Threshold" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1+</SelectItem>
                <SelectItem value="5">5+</SelectItem>
                <SelectItem value="10">10+</SelectItem>
                <SelectItem value="20">20+</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button onClick={refresh} variant="outline" size="sm" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Refresh
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : analytics.length === 0 ? (
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>No concerns detected</AlertTitle>
            <AlertDescription>
              No schools with significant negative feedback were found based on current threshold.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School</TableHead>
                  <TableHead>Survey</TableHead>
                  <TableHead className="text-center">Responses</TableHead>
                  <TableHead className="text-center">Avg. Score</TableHead>
                  <TableHead>Negative Feedback</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.map((item) => {
                  const [severity, variant] = getFeedbackSeverity(item.feedbackRatio);
                  
                  return (
                    <TableRow key={item.surveyId}>
                      <TableCell>
                        <div className="font-medium">{item.schoolName}</div>
                        <div className="text-sm text-muted-foreground">{item.userName}</div>
                      </TableCell>
                      <TableCell>{item.surveyName}</TableCell>
                      <TableCell className="text-center">{item.responseCount}</TableCell>
                      <TableCell className="text-center">
                        <span className={getSentimentColor(item.avgScore)}>
                          {item.avgScore}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>{item.negativeFeedbackCount} negative responses</span>
                            <Badge variant={variant as any}>{severity}</Badge>
                          </div>
                          <Progress value={item.feedbackRatio} className="h-2" />
                          <div className="text-xs text-muted-foreground">{item.feedbackRatio}% negative feedback</div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SurveyFeedbackAnalytics;
