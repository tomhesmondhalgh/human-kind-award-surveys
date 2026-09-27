
import { SummaryData } from "./summaryUtils";
import { supabase } from '@/integrations/supabase/client';
import {
  DetailedQuestionResponse,
  LEAVING_CONTEMPLATION_OPTIONS,
  LeavingContemplationData,
} from "./analysisUtils";
import { canShowResults, MIN_RESPONSES_TO_SHOW_RESULTS } from '@/lib/anonymity';

// Function to generate PDF from the analysis content
export const generatePDF = async (
  analysisRef: React.RefObject<HTMLDivElement>,
  fileName: string = 'survey-analysis.pdf'
): Promise<void> => {
  if (!analysisRef.current) {
    console.error('Analysis container ref is not available');
    return;
  }

  // Loaded on demand: these libraries are large and only needed for export.
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);

  const contentElement = analysisRef.current;
  const pdfWidth = 210; // A4 width in mm
  const pdfHeight = 297; // A4 height in mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  try {
    // Add title to PDF
    doc.setFontSize(18);
    doc.text('Survey Analysis Report', 20, 20);
    doc.setFontSize(12);
    
    // Split content into sections for better processing
    const sections = Array.from(contentElement.children) as HTMLElement[];
    
    let currentY = 30; // Start position after title
    const margin = 20; // Margin on each side
    const availablePageHeight = pdfHeight - 40; // Available height per page (excluding margins)
    
    // Process each section one by one
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      
      // Capture each section as an image
      const canvas = await html2canvas(section, {
        scale: 1.5, // Higher resolution
        logging: false,
        useCORS: true,
        allowTaint: true,
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      // Calculate dimensions to fit within PDF width
      const contentWidth = pdfWidth - (margin * 2); // margins on each side
      const scaledHeight = (canvas.height * contentWidth) / canvas.width;
      
      // Check if this section needs to go to a new page
      if (currentY + scaledHeight > availablePageHeight && i > 0) {
        doc.addPage();
        currentY = margin;
      }
      
      // Add the image to the PDF
      doc.addImage(imgData, 'PNG', margin, currentY, contentWidth, scaledHeight);
      
      // Update the Y position for the next section
      currentY += scaledHeight + 10; // Add some spacing between sections
    }
    
    // Save the PDF
    doc.save(fileName);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

export interface AnalysisEmailInput {
  summary: SummaryData | null;
  recommendationScore: { score: number; nationalAverage: number };
  leavingContemplation: LeavingContemplationData;
  detailedResponses: DetailedQuestionResponse[];
}

const toPercentRecord = (values: Record<string, number> | undefined) =>
  Object.fromEntries(
    Object.entries(values ?? {}).map(([key, value]) => [key, Math.round((Number(value) || 0) * 100)])
  );

// Only send a summary the email can show: real findings or the "not enough
// responses yet" notice. A failed or still-loading summary is left out.
const hasSummaryContent = (summary: SummaryData | null): boolean =>
  !!summary &&
  !summary.unavailable &&
  (!!summary.insufficientData ||
    (summary.strengths?.length ?? 0) > 0 ||
    (summary.improvements?.length ?? 0) > 0);

// Shapes the report for the send-analysis-email function, which expects
// leaving-question counts (it works out the percentages) and whole-number
// percentages for the wellbeing questions.
export const buildAnalysisEmailReport = ({
  summary,
  recommendationScore,
  leavingContemplation,
  detailedResponses,
}: AnalysisEmailInput) => ({
  summary: hasSummaryContent(summary) ? summary : null,
  recommendationScore,
  leavingData: LEAVING_CONTEMPLATION_OPTIONS.map((option) => ({
    name: option,
    value: leavingContemplation.counts[option] ?? 0,
  })),
  detailedResponses: detailedResponses.map((question) => ({
    question: question.question,
    schoolResponses: toPercentRecord(question.schoolResponses),
    nationalResponses: toPercentRecord(question.nationalResponses),
  })),
});

// Function to send analysis report via email
export const sendReportByEmail = async (
  email: string,
  surveyId: string,
  responseCount: number,
  input: AnalysisEmailInput
): Promise<void> => {
  if (!canShowResults(responseCount)) {
    throw new Error(
      `Results can only be shared once at least ${MIN_RESPONSES_TO_SHOW_RESULTS} people have responded.`
    );
  }

  // The edge function builds the email from this data and escapes it.
  const { error } = await supabase.functions.invoke('send-analysis-email', {
    body: {
      to: email,
      surveyId,
      report: buildAnalysisEmailReport(input),
    },
  });

  if (error) {
    console.error('Error sending report by email:', error);
    throw error;
  }
};
