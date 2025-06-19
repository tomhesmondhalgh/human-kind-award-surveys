
import React, { useState, useEffect, useRef } from 'react';
import { toast } from "sonner";
import MainLayout from '../components/layout/MainLayout';
import { 
  getSurveyOptions, 
  getRecommendationScore, 
  getLeavingContemplation, 
  getDetailedWellbeingResponses, 
  getTextResponses, 
  getCustomQuestionResponses 
} from '../utils/analysisUtils';
import { getSurveySummary } from '../utils/summaryUtils';
import { generatePDF, sendReportByEmail } from '../utils/reportUtils';
import { useAuth } from '../contexts/AuthContext';
import ScreenOrientationOverlay from '../components/ui/ScreenOrientationOverlay';
import { useOrientation } from '../hooks/useOrientation';
import { useSubscription } from '../hooks/useSubscription';
import NoDataDisplay from '../components/analysis/NoDataDisplay';
import SurveyControls from '../components/analysis/SurveyControls';
import DataWrapper from '../components/analysis/DataWrapper';

const Analysis = () => {
  const { user } = useAuth();
  const analysisRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [surveyOptions, setSurveyOptions] = useState<any[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<string>("");
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
  const [leavingContemplation, setLeavingContemplation] = useState<Record<string, number>>({});
  const [detailedResponses, setDetailedResponses] = useState<any[]>([]);
  const [textResponses, setTextResponses] = useState({
    doingWell: [],
    improvements: []
  });
  const [customQuestionResponses, setCustomQuestionResponses] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
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
        
        if (options.length === 0) {
          setNoData(true);
        } else {
          setSelectedSurvey(options[0]?.id || "");
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading survey options:', error);
        toast.error("Failed to load surveys");
        setLoading(false);
        setNoData(true);
      }
    };
    
    loadSurveyOptions();
  }, [user]);

  useEffect(() => {
    const loadData = async () => {
      if (!selectedSurvey) return;
      try {
        setLoading(true);
        let startDate = "";
        let endDate = "";
        if (selectedTimeRange === "last-30-days") {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          startDate = thirtyDaysAgo.toISOString().split('T')[0];
        } else if (selectedTimeRange === "last-90-days") {
          const ninetyDaysAgo = new Date();
          ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
          startDate = ninetyDaysAgo.toISOString().split('T')[0];
        } else if (selectedTimeRange === "custom-range" && customDateRange.from) {
          startDate = customDateRange.from.toISOString().split('T')[0];
          if (customDateRange.to) {
            endDate = customDateRange.to.toISOString().split('T')[0];
          }
        }
        const [recommendationScoreData, leavingContemplationData, detailedResponsesData, textResponsesData, customQuestionResponsesData] = await Promise.all([
          getRecommendationScore(selectedSurvey, startDate, endDate), 
          getLeavingContemplation(selectedSurvey, startDate, endDate), 
          getDetailedWellbeingResponses(selectedSurvey, startDate, endDate), 
          getTextResponses(selectedSurvey, startDate, endDate),
          getCustomQuestionResponses(selectedSurvey, startDate, endDate)
        ]);
        
        setRecommendationScore(recommendationScoreData);
        setLeavingContemplation(leavingContemplationData);
        setDetailedResponses(detailedResponsesData);
        setTextResponses(textResponsesData);
        setCustomQuestionResponses(customQuestionResponsesData);
        
        const summaryData = await getSurveySummary(selectedSurvey, recommendationScoreData, leavingContemplationData, detailedResponsesData, textResponsesData);
        setSummary(summaryData);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error("Failed to load data for selected survey");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [selectedSurvey, selectedTimeRange, customDateRange]);

  const handleSurveyChange = (value: string) => {
    setSelectedSurvey(value);
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
      setExportLoading(true);
      if (!user?.email) {
        toast.error("User email not found. Cannot send report.");
        return;
      }
      const surveyName = getSurveyName();
      const leavingData = Object.entries(leavingContemplation).map(([name, value]) => ({
        name,
        value
      }));
      await sendReportByEmail(user.email, selectedSurvey, surveyName, summary, recommendationScore, leavingData, detailedResponses, textResponses);
      toast.success("Report sent to your email!");
    } catch (error) {
      console.error("Error sending report:", error);
      toast.error("Failed to send report to email");
    } finally {
      setExportLoading(false);
    }
  };

  const shouldShowOverlay = isMobile && orientation === 'portrait' && !overlayDismissed;

  if (noData) {
    return <NoDataDisplay />;
  }

  return (
    <MainLayout>
      {shouldShowOverlay && <ScreenOrientationOverlay onDismiss={() => setOverlayDismissed(true)} />}
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold mb-2">Survey Analysis</h1>
          <p className="text-gray-600">Compare your school's results with national benchmarks</p>
        </div>

        <SurveyControls 
          surveyOptions={surveyOptions}
          selectedSurvey={selectedSurvey}
          selectedTimeRange={selectedTimeRange}
          customDateRange={customDateRange}
          exportLoading={exportLoading}
          onSurveyChange={handleSurveyChange}
          onTimeRangeChange={handleTimeRangeChange}
          onCustomDateRangeChange={handleCustomDateRangeChange}
          onExportReport={handleExportReport}
          onExportPDF={handleExportPDF}
        />

        <DataWrapper 
          isLoading={loading || subscriptionLoading}
          summary={summary}
          recommendationScore={recommendationScore}
          leavingContemplation={leavingContemplation}
          detailedResponses={detailedResponses}
          textResponses={textResponses}
          customQuestionResponses={customQuestionResponses}
          hasNationalAccess={hasNationalAccess}
          analysisRef={analysisRef}
        />
      </div>
    </MainLayout>
  );
};

export default Analysis;
