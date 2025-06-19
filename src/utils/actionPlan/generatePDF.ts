
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import { ActionPlanDescriptor } from '../../types/actionPlan';

export async function generatePDF(organizationId: string): Promise<{ success: boolean; error?: any }> {
  try {
    console.log('Generating PDF for organization:', organizationId);
    
    // Fetch all descriptors for the organization
    const { data: descriptors, error } = await supabase
      .from('action_plan_descriptors')
      .select('*')
      .eq('organization_id', organizationId)
      .order('section')
      .order('index_number');
    
    if (error) {
      console.error('Error fetching descriptors for PDF:', error);
      return { success: false, error };
    }
    
    if (!descriptors || descriptors.length === 0) {
      return { success: false, error: 'No action plan data found to export' };
    }
    
    // Create PDF
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('Wellbeing Action Plan', 20, 20);
    
    // Add generation date
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 20, 35);
    
    let yPosition = 50;
    
    // Group descriptors by section
    const sections = [...new Set(descriptors.map(d => d.section))];
    
    sections.forEach(section => {
      const sectionDescriptors = descriptors.filter(d => d.section === section);
      
      // Add section header
      doc.setFontSize(16);
      doc.text(section, 20, yPosition);
      yPosition += 10;
      
      // Create table data
      const tableData = sectionDescriptors.map(descriptor => [
        descriptor.index_number || '',
        descriptor.descriptor_text || '',
        descriptor.status || '',
        descriptor.assigned_to || '',
        descriptor.deadline ? new Date(descriptor.deadline).toLocaleDateString('en-GB') : '',
        descriptor.key_actions || ''
      ]);
      
      // Add table
      (doc as any).autoTable({
        startY: yPosition,
        head: [['Ref', 'Description', 'Status', 'Assigned To', 'Deadline', 'Key Actions']],
        body: tableData,
        theme: 'striped',
        styles: {
          fontSize: 8,
          cellPadding: 3
        },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 60 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
          4: { cellWidth: 20 },
          5: { cellWidth: 40 }
        },
        margin: { left: 20, right: 20 }
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 15;
      
      // Add new page if needed
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
    });
    
    // Save the PDF
    doc.save('wellbeing-action-plan.pdf');
    
    return { success: true };
  } catch (error) {
    console.error('Error generating PDF:', error);
    return { success: false, error };
  }
}
