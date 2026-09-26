
import { SummaryData } from "./summaryUtils";
import { supabase } from "../lib/supabase";
import { DetailedQuestionResponse, TextResponse } from "./analysisUtils";

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

// Function to send analysis report via email
export const sendReportByEmail = async (
  email: string,
  surveyId: string,
  surveyName: string,
  summaryData: SummaryData | null,
  recommendationScore: { score: number; nationalAverage: number },
  leavingData: { name: string; value: number }[],
  detailedResponses: DetailedQuestionResponse[],
  textResponses: { doingWell: TextResponse[]; improvements: TextResponse[] }
): Promise<void> => {
  try {
    // The edge function builds the email from this data and escapes it.
    const { error } = await supabase.functions.invoke('send-analysis-email', {
      body: {
        to: email,
        surveyId,
        report: {
          summary: summaryData,
          recommendationScore,
          leavingData,
          detailedResponses,
        },
      },
    });

    if (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error sending report by email:', error);
    throw error;
  }
};
