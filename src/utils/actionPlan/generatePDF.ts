
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { getSectionProgressSummary } from "./sectionProgressSummary";
import { getActionPlanDescriptors } from "./getDescriptors";
import { ACTION_PLAN_SECTIONS } from "../../types/actionPlan";

/**
 * Generate PDF from action plan
 */
export const generatePDF = async (
  userId: string
): Promise<{ success: boolean, error?: string }> => {
  try {
    console.log('Generating PDF for user:', userId);

    // Get summary data
    const summaryResult = await getSectionProgressSummary(userId);
    if (!summaryResult.success || !summaryResult.data) {
      return { success: false, error: summaryResult.error || 'Failed to fetch summary data' };
    }

    // Create new PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Add title
    doc.setFontSize(22);
    doc.setTextColor(85, 51, 136); // Purple color
    doc.text('Wellbeing Action Plan', 105, 20, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text('Generated: ' + new Date().toLocaleDateString('en-GB'), 105, 30, { align: 'center' });

    // Add summary section
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Summary of Progress', 20, 45);

    // Create summary table
    const summaryData = summaryResult.data.map(section => [
      section.title,
      `${section.completedCount}/${section.totalCount - section.notApplicableCount}`,
      `${section.percentComplete}%`
    ]);

    (doc as any).autoTable({
      head: [['Section', 'Completed', 'Progress']],
      body: summaryData,
      startY: 50,
      theme: 'grid',
      headStyles: { fillColor: [85, 51, 136], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 240, 250] }
    });

    // Fetch all action plan sections data
    let currentY = (doc as any).lastAutoTable.finalY + 15;

    for (const section of ACTION_PLAN_SECTIONS) {
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(85, 51, 136);
      doc.text(section.title, 20, currentY);
      currentY += 10;

      const descriptorsResult = await getActionPlanDescriptors(userId, section.title);

      if (descriptorsResult.success && descriptorsResult.data && descriptorsResult.data.length > 0) {
        const descriptors = descriptorsResult.data;

        const descriptorRows = descriptors.map(descriptor => [
          descriptor.index_number,
          descriptor.descriptor_text.substring(0, 40) + (descriptor.descriptor_text.length > 40 ? '...' : ''),
          descriptor.status,
          descriptor.assigned_to || '',
          descriptor.deadline ? new Date(descriptor.deadline).toLocaleDateString('en-GB') : ''
        ]);

        (doc as any).autoTable({
          head: [['#', 'Description', 'Status', 'Assigned To', 'Deadline']],
          body: descriptorRows,
          startY: currentY,
          theme: 'grid',
          styles: { fontSize: 9 },
          headStyles: { fillColor: [130, 106, 168], textColor: [255, 255, 255] },
          columnStyles: {
            0: { cellWidth: 15 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 30 },
            3: { cellWidth: 30 },
            4: { cellWidth: 25 }
          }
        });

        currentY = (doc as any).lastAutoTable.finalY + 15;
      } else {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('No data available for this section', 20, currentY);
        currentY += 15;
      }
    }

    // Add footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`National Staff Wellbeing Survey - Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
    }

    doc.save('Wellbeing_Action_Plan.pdf');

    return { success: true };
  } catch (error) {
    console.error('Error generating PDF:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};
