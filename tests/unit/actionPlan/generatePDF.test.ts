import { describe, it, expect, vi } from 'vitest';
import type { jsPDF } from 'jspdf';
import { generatePDF } from '@/utils/actionPlan/generatePDF';

// Two sections of fake descriptors, enough to draw two autoTables.
const descriptors = vi.hoisted(() => [
  { section: 'Leadership', index_number: '1.1', descriptor_text: 'Leaders model wellbeing', status: 'In Progress', assigned_to: 'Alex', deadline: '2026-12-01', key_actions: 'Termly review' },
  { section: 'Leadership', index_number: '1.2', descriptor_text: 'Wellbeing in strategy', status: 'Not Started', assigned_to: null, deadline: null, key_actions: null },
  { section: 'Staff', index_number: '2.1', descriptor_text: 'Staff survey each year', status: 'Completed', assigned_to: 'Sam', deadline: '2026-10-15', key_actions: 'Share results' },
]);

// Capture the document instead of writing a file: save() is attached per
// instance by jsPDF, so override it after construction.
const saved = vi.hoisted(() => [] as { doc: any; fileName: string }[]);
vi.mock('jspdf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jspdf')>();
  class TestPDF extends actual.jsPDF {
    constructor(...args: any[]) {
      super(...args);
      (this as any).save = (fileName: string) => {
        saved.push({ doc: this, fileName });
        return this;
      };
    }
  }
  return { ...actual, jsPDF: TestPDF, default: TestPDF };
});

vi.mock('@/integrations/supabase/client', () => {
  const query: any = {
    select: () => query,
    eq: () => query,
    order: () => query,
    then: (resolve: any) => resolve({ data: descriptors, error: null }),
  };
  return { supabase: { from: () => query } };
});

describe('action plan generatePDF', () => {
  it('builds a PDF with jspdf + jspdf-autotable and saves it', async () => {
    const result = await generatePDF('org-1');

    expect(result).toEqual({ success: true });
    expect(saved).toHaveLength(1);
    expect(saved[0].fileName).toBe('wellbeing-action-plan.pdf');
    const savedDoc: jsPDF = saved[0].doc;
    expect((savedDoc as any).lastAutoTable.finalY).toBeGreaterThan(50);

    const pdf = savedDoc.output('arraybuffer');
    expect(pdf.byteLength).toBeGreaterThan(1000);
    const text = new TextDecoder('latin1').decode(pdf);
    expect(text.startsWith('%PDF-')).toBe(true);
    // Table cell text from both sections made it into the (uncompressed) PDF.
    expect(text).toContain('Leaders model wellbeing');
    expect(text).toContain('Staff survey each year');
  });
});
