
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from "sonner";
import MainLayout from '../components/layout/MainLayout';
import PageContainer from '../components/layout/PageContainer';
import PageTitle from '../components/ui/PageTitle';
import { 
  getSurveyOptions, 
  getRecommendationScore, 
  getLeavingContemplation, 
  getDetailedWellbeingResponses, 
  getTextResponses, 
  getCustomQuestionResponses,
  getResponseCount,
  emptyLeavingContemplation,
  type LeavingContemplationData,
  type SurveyOption,
  type TextResponse
} from '../utils/analysisUtils';
import { buildAnalysisDateRange } from '../utils/analysisDateRange';
import { getSurveySummary, type SummaryData } from '../utils/summaryUtils';
import { canShowResults, MIN_RESPONSES_TO_SHOW_RESULTS } from '../lib/anonymity';
import { generatePDF, sendReportByEmail } from '../utils/reportUtils';
import { useAuth } from '../contexts/AuthContext';
import ScreenOrientationOverlay from '../components/ui/ScreenOrientationOverlay';
import { useOrientation } from '../hooks/useOrientation';
import { useSubscription } from '../hooks/useSubscription';
import NoDataDisplay from '../components/analysis/NoDataDisplay';
import SurveyControls from '../components/analysis/SurveyControls';
import DataWrapper from '../components/analysis/DataWrapper';
import EmptyAnalysisState from '../components/analysis/EmptyAnalysisState';

const Analysis = () => {
  const { user } = useAuth();
  const analysisRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [surveyOptions, setSurveyOptions] = useState<SurveyOption[]>([]);
  const requestedSurveyId = searchParams.get('surveyId');
  // The URL is the source of truth, so dashboard links land on the right survey.
  const selectedSurvey = surveyOptions.some(s => s.id === requestedSurveyId)
    ? (requestedSurveyId as string)
    : surveyOptions[0]?.id ?? "";
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>("all-time");
  const [customDateRange, setCustomDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined
  });
  const [recommendationScore, setRecommendationScore] = useState({
    score: 0,
    nationalAverage: 0
  });
  const [responseCount, setResponseCount] = useState(0);
  const [leavingContemplation, setLeavingContemplation] = useState<LeavingContemplationData>(emptyLeavingContemplation());
  const [detailedResponses, setDetailedResponses] = useState<any[]>([]);
  const [textResponses, setTextResponses] = useState<{ doingWell: TextResponse[]; improvements: TextResponse[] }>({
    doingWell: [],
    improvements: []
  });
  const [customQuestionResponses, setCustomQuestionResponses] = useState<any[]>([]);
  const [summary, setSummary] = useState<Partial<SummaryData>>({});
  const [noData, setNoData] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [overlayDismissed, setOverlayDismissed] = useState(false);
  const { orientation, isMobile } = useOrientation();
  const { hasAccess, isLoading: subscriptionLoading } = useSubscription();
  const [hasNationalAccess, setHasNationalAccess] = useState(false);
  
  useEffect(() => {
    const checkAccess = async () => {
      if (user) {
        const foundationAccess = await hasAccess('foundation');
        setHasNationalAccess(foundationAccess);
      }
    };
    
    checkAccess();
  }, [user, hasAccess]);

  useEffect(() => {
    const loadSurveyOptions = async () => {
      try {
        if (!user) return;
        
        console.log('Fetching survey options for user:', user.id);
        const options = await getSurveyOptions(user.id);
        console.log('Fetched survey options:', options);
        
        setSurveyOptions(options);
        
        // With surveys, loading continues until the selected survey's data arrives.
        if (options.length === 0) {
          setNoData(true);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading survey options:', error);
        toast.error("Failed to load surveys");
        setLoading(false);
        setNoData(true);
      }
    };
    
    loadSurveyOptions();
  }, [user]);

  // Keep ?surveyId= in step with the survey actually shown.
  useEffect(() => {
    if (selectedSurvey && requestedSurveyId !== selectedSurvey) {
      setSearchParams(params => {
        const next = new URLSearchParams(params);
        next.set('surveyId', selectedSurvey);
        return next;
      }, { replace: true });
    }
  }, [selectedSurvey, requestedSurveyId, setSearchParams]);

  useEffect(() => {
    if (!selectedSurvey) return;
    // Ignore results from a request that a newer survey/date choice has replaced.
    let cancelled = false;

    const clearResults = () => {
      setLeavingContemplation(emptyLeavingContemplation());
      setDetailedResponses([]);
      setTextResponses({ doingWell: [], improvements: [] });
      setCustomQuestionResponses([]);
      setSummary({});
    };

    const loadData = async () => {
      try {
        setLoading(true);
        const { startDate, endDate } = buildAnalysisDateRange(selectedTimeRange, customDateRange);

        const count = await getResponseCount(selectedSurvey, startDate, endDate);
        if (cancelled) return;
        setResponseCount(count);

        // Below the anonymity floor nothing is fetched or shown.
        if (!canShowResults(count)) {
          clearResults();
          return;
        }

        const [recommendationScoreData, leavingContemplationData, detailedResponsesData, textResponsesData, customQuestionResponsesData] = await Promise.all([
          getRecommendationScore(selectedSurvey, startDate, endDate), 
          getLeavingContemplation(selectedSurvey, startDate, endDate), 
          getDetailedWellbeingResponses(selectedSurvey, startDate, endDate), 
          getTextResponses(selectedSurvey, startDate, endDate),
          getCustomQuestionResponses(selectedSurvey, startDate, endDate)
        ]);
        if (cancelled) return;
        
        setRecommendationScore(recommendationScoreData);
        setLeavingContemplation(leavingContemplationData);
        setDetailedResponses(detailedResponsesData);
        setTextResponses(textResponsesData);
        setCustomQuestionResponses(customQuestionResponsesData);
        
        const summaryData = await getSurveySummary(count, recommendationScoreData, leavingContemplationData, detailedResponsesData, textResponsesData);
        if (cancelled) return;
        setSummary(summaryData);
      } catch (error) {
        if (cancelled) return;
        console.error('Error loading data:', error);
        // Fail closed: without a trustworthy count, show nothing.
        setResponseCount(0);
        clearResults();
        toast.error("Failed to load data for selected survey");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadData();

    return () => {
      cancelled = true;
    };
  }, [selectedSurvey, selectedTimeRange, customDateRange]);

  const handleSurveyChange = (value: string) => {
    setSearchParams(params => {
      const next = new URLSearchParams(params);
      next.set('surveyId', value);
      return next;
    });
  };

  const handleTimeRangeChange = (value: string) => {
    setSelectedTimeRange(value);
    if (value !== "custom-range") {
      setCustomDateRange({
        from: undefined,
        to: undefined
      });
    }
  };

  const handleCustomDateRangeChange = (range: { from: Date | undefined; to: Date | undefined }) => {
    setCustomDateRange(range);
  };

  const getSurveyName = () => {
    const survey = surveyOptions.find(s => s.id === selectedSurvey);
    return survey ? survey.name : '';
  };

  const handleExportPDF = async () => {
    try {
      if (!canShowResults(responseCount)) {
        toast.error(`Results can be exported once at least ${MIN_RESPONSES_TO_SHOW_RESULTS} people have responded.`);
        return;
      }
      setExportLoading(true);
      if (!analysisRef.current) {
        toast.error("Cannot generate PDF. Report content not found.");
        return;
      }
      const surveyName = getSurveyName();
      const fileName = `${surveyName.replace(/\s+/g, '-').toLowerCase()}-analysis.pdf`;
      await generatePDF(analysisRef, fileName);
      toast.success("PDF generated successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF report");
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportReport = async () => {
    try {
      if (!canShowResults(responseCount)) {
        toast.error(`Results can be shared once at least ${MIN_RESPONSES_TO_SHOW_RESULTS} people have responded.`);
        return;
      }
      setExportLoading(true);
      if (!user?.email) {
        toast.error("User email not found. Cannot send report.");
        return;
      }
      await sendReportByEmail(user.email, selectedSurvey, responseCount, {
        summary: summary as SummaryData,
        recommendationScore,
        leavingContemplation,
        detailedResponses
      });
      toast.success("Report sent to your email!");
    } catch (error) {
      console.error("Error sending report:", error);
      toast.error("Failed to send report to email");
    } finally {
      setExportLoading(false);
    }
  };

  const activeDateRange = buildAnalysisDateRange(selectedTimeRange, customDateRange);
  const isDateFiltered = Boolean(activeDateRange.startDate || activeDateRange.endDate);

  const shouldShowOverlay = isMobile && orientation === 'portrait' && !overlayDismissed;

  if (noData) {
    return <NoDataDisplay />;
  }

  return (
    <MainLayout>
      {shouldShowOverlay && <ScreenOrientationOverlay onDismiss={() => setOverlayDismissed(true)} />}
      
      <PageContainer className="max-w-6xl">
        <PageTitle 
          title="Survey Analysis"
          subtitle="Compare your school's results with national benchmarks"
        />

        <SurveyControls
          surveyOptions={surveyOptions}
          selectedSurvey={selectedSurvey}
          selectedTimeRange={selectedTimeRange}
          customDateRange={customDateRange}
          exportLoading={exportLoading}
          exportDisabled={loading || !canShowResults(responseCount)}
          onSurveyChange={handleSurveyChange}
          onTimeRangeChange={handleTimeRangeChange}
          onCustomDateRangeChange={handleCustomDateRangeChange}
          onExportReport={handleExportReport}
          onExportPDF={handleExportPDF}
        />

        {!selectedSurvey ? (
          <EmptyAnalysisState />
        ) : (
          <DataWrapper 
            isLoading={loading || subscriptionLoading}
            responseCount={responseCount}
            dateFiltered={isDateFiltered}
            summary={summary}
            recommendationScore={recommendationScore}
            leavingContemplation={leavingContemplation}
            detailedResponses={detailedResponses}
            textResponses={textResponses}
            customQuestionResponses={customQuestionResponses}
            hasNationalAccess={hasNationalAccess}
            analysisRef={analysisRef}
          />
        )}
      </PageContainer>
    </MainLayout>
  );
};

export default Analysis;
