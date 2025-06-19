
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
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
    // Generate the HTML content for the email
    const htmlContent = generateEmailHTML(
      surveyName,
      summaryData,
      recommendationScore,
      leavingData,
      detailedResponses
    );

    const { error } = await supabase.functions.invoke('send-analysis-email', {
      body: {
        to: email,
        subject: `Survey Analysis Report: ${surveyName}`,
        htmlContent,
        surveyId,
        surveyName
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

// Helper function to generate the HTML content for the email
const generateEmailHTML = (
  surveyName: string,
  summaryData: SummaryData | null,
  recommendationScore: { score: number; nationalAverage: number },
  leavingData: { name: string; value: number }[],
  detailedResponses: DetailedQuestionResponse[]
): string => {
  // Create a simple HTML table for the leaving contemplation data
  const leavingDataTotal = leavingData.reduce((sum, item) => sum + item.value, 0);
  const leavingDataHTML = leavingData.map(item => {
    const percentage = leavingDataTotal > 0 ? (item.value / leavingDataTotal * 100).toFixed(1) : "0.0";
    return `<tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.name}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.value}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${percentage}%</td>
    </tr>`;
  }).join('');

  // Create HTML content for detailed wellbeing responses
  const detailedResponsesHTML = detailedResponses.map(question => {
    const schoolPositive = (question.schoolResponses["Strongly Agree"] || 0) + (question.schoolResponses["Agree"] || 0);
    const nationalPositive = (question.nationalResponses["Strongly Agree"] || 0) + (question.nationalResponses["Agree"] || 0);
    const difference = schoolPositive - nationalPositive;
    let comparisonText = '';
    
    if (Math.abs(difference) < 10) {
      comparisonText = 'Similar to average';
    } else if (difference > 0) {
      comparisonText = 'Above average';
    } else {
      comparisonText = 'Below average';
    }
    
    return `
      <div style="margin: 20px 0; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h4 style="margin-bottom: 8px; font-size: 16px; font-weight: 600; text-align: center;">${question.question}</h4>
        <p style="text-align: center; margin-bottom: 15px; color: #6b7280;">${comparisonText}</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <tr>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Response</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Your School</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">National Average</th>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">Strongly Agree</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${question.schoolResponses["Strongly Agree"] || 0}%</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${question.nationalResponses["Strongly Agree"] || 0}%</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">Agree</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${question.schoolResponses["Agree"] || 0}%</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${question.nationalResponses["Agree"] || 0}%</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">Disagree</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${question.schoolResponses["Disagree"] || 0}%</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${question.nationalResponses["Disagree"] || 0}%</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">Strongly Disagree</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${question.schoolResponses["Strongly Disagree"] || 0}%</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${question.nationalResponses["Strongly Disagree"] || 0}%</td>
          </tr>
        </table>
      </div>
    `;
  }).join('');

  let summaryHTML = '';
  if (summaryData && !summaryData.insufficientData) {
    const strengthsHTML = summaryData.strengths.map(strength => 
      `<li style="margin-bottom: 8px;">${strength}</li>`
    ).join('');
    
    const improvementsHTML = summaryData.improvements.map(improvement => 
      `<li style="margin-bottom: 8px;">${improvement}</li>`
    ).join('');
    
    summaryHTML = `
      <div style="margin: 20px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #f9fafb;">
        <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 18px; color: #111827;">AI-Powered Summary</h3>
        
        <div style="margin-bottom: 15px;">
          <h4 style="margin-top: 0; margin-bottom: 10px; font-size: 16px; color: #047857;">Areas of Strength</h4>
          <ul style="padding-left: 20px; margin-top: 0;">${strengthsHTML}</ul>
        </div>
        
        <div>
          <h4 style="margin-top: 0; margin-bottom: 10px; font-size: 16px; color: #b45309;">Areas for Improvement</h4>
          <ul style="padding-left: 20px; margin-top: 0;">${improvementsHTML}</ul>
        </div>
      </div>
    `;
  } else if (summaryData?.insufficientData) {
    summaryHTML = `
      <div style="margin: 20px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #f9fafb; text-align: center;">
        <p style="color: #b45309; margin: 0;">Not enough data available for AI analysis. A minimum of 20 survey responses is required.</p>
      </div>
    `;
  }

  // Combine everything into the final HTML
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Survey Analysis Report: ${surveyName}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
      <h1 style="text-align: center; color: #3b82f6; margin-bottom: 30px;">Survey Analysis Report</h1>
      <h2 style="text-align: center; color: #4b5563; margin-bottom: 30px;">${surveyName}</h2>
      
      ${summaryHTML}
      
      <div style="margin: 30px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #f9fafb;">
        <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 18px; color: #111827;">Recommendation Score</h3>
        <div style="display: flex; justify-content: center; text-align: center;">
          <div style="margin: 0 30px;">
            <p style="font-size: 24px; font-weight: bold; color: #4f46e5; margin-bottom: 5px;">${recommendationScore.score}</p>
            <p style="margin-top: 0; color: #6b7280;">Your School</p>
          </div>
          <div style="margin: 0 30px;">
            <p style="font-size: 24px; font-weight: bold; color: #6b7280; margin-bottom: 5px;">${recommendationScore.nationalAverage}</p>
            <p style="margin-top: 0; color: #6b7280;">National Average</p>
          </div>
        </div>
        <p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px;">
          Average score for "How likely are you to recommend this organisation to others as a great place to work?" (0-10)
        </p>
      </div>
      
      <div style="margin: 30px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #f9fafb;">
        <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 18px; color: #111827;">Staff Contemplating Leaving</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Response</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Count</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Percentage</th>
          </tr>
          ${leavingDataHTML}
        </table>
        <p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px;">
          Responses to "In the last 6 months I have contemplated leaving my role"
        </p>
      </div>
      
      <div style="margin: 30px 0;">
        <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 18px; color: #111827;">Detailed Wellbeing Responses</h3>
        ${detailedResponsesHTML}
      </div>
      
      <div style="margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
        <p>This report was generated automatically by SchoolPulse.</p>
      </div>
    </body>
    </html>
  `;
};
