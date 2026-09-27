import { describe, it, expect, vi, beforeEach } from 'vitest';
import { certificateFileName, generateCertificate } from '@/utils/accreditation/generateCertificate';

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

function pdfText(doc: any): string {
  return new TextDecoder('latin1').decode(doc.output('arraybuffer'));
}

describe('generateCertificate', () => {
  beforeEach(() => {
    saved.length = 0;
  });

  it('saves a landscape A4 certificate with the school, dates and wording', async () => {
    await generateCertificate({
      organizationName: 'Oak Tree Primary School',
      approvedAt: '2026-09-15T10:00:00Z',
      validUntil: '2027-09-15T10:00:00Z',
    });

    expect(saved).toHaveLength(1);
    const { doc, fileName } = saved[0];
    expect(fileName).toBe('human-kind-award-certificate-oak-tree-primary-school.pdf');
    expect(doc.internal.pageSize.getWidth()).toBeGreaterThan(doc.internal.pageSize.getHeight());

    const text = pdfText(doc);
    expect(text.startsWith('%PDF-')).toBe(true);
    expect(text).toContain('Human Kind Award');
    expect(text).toContain('Oak Tree Primary School');
    expect(text).toContain('Accredited');
    expect(text).toContain('Accredited on 15 September 2026');
    expect(text).toContain('Valid until 15 September 2027');
  });

  it('leaves out the valid-until line when there is no next due date', async () => {
    await generateCertificate({ organizationName: 'Ash School', approvedAt: '2026-01-02T00:00:00Z', validUntil: null });

    const text = pdfText(saved[0].doc);
    expect(text).toContain('Accredited on 2 January 2026');
    expect(text).not.toContain('Valid until');
  });
});

describe('certificateFileName', () => {
  it('slugs the organisation name', () => {
    expect(certificateFileName("St. Mary's C of E (VA)")).toBe('human-kind-award-certificate-st-mary-s-c-of-e-va.pdf');
    expect(certificateFileName('***')).toBe('human-kind-award-certificate.pdf');
  });
});
