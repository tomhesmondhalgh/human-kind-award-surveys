export interface CertificateDetails {
  organizationName: string;
  approvedAt: string;
  validUntil?: string | null;
}

// Brand purple (tailwind brandPurple-700 / 800).
const PURPLE: [number, number, number] = [110, 89, 165];
const DEEP_PURPLE: [number, number, number] = [91, 70, 133];
const GREY: [number, number, number] = [90, 90, 90];

export function formatCertificateDate(value: string): string {
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function certificateFileName(organizationName: string): string {
  const slug = organizationName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `human-kind-award-certificate${slug ? `-${slug}` : ''}.pdf`;
}

// Draws a one-page landscape A4 certificate and saves it.
export async function generateCertificate(details: CertificateDetails): Promise<void> {
  // Loaded on demand as it's large.
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const centre = width / 2;

  // Double border.
  doc.setDrawColor(...PURPLE);
  doc.setLineWidth(2);
  doc.rect(10, 10, width - 20, height - 20);
  doc.setLineWidth(0.5);
  doc.rect(15, 15, width - 30, height - 30);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PURPLE);
  doc.setFontSize(34);
  doc.text('Human Kind Award', centre, 50, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GREY);
  doc.setFontSize(14);
  doc.text('Certificate of Accreditation', centre, 62, { align: 'center' });

  doc.setDrawColor(...PURPLE);
  doc.setLineWidth(0.6);
  doc.line(centre - 40, 70, centre + 40, 70);

  doc.setFontSize(13);
  doc.text('This is to certify that', centre, 88, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DEEP_PURPLE);
  doc.setFontSize(26);
  const nameLines = doc.splitTextToSize(details.organizationName, width - 70) as string[];
  doc.text(nameLines, centre, 104, { align: 'center' });
  const afterName = 104 + (nameLines.length - 1) * 11;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GREY);
  doc.setFontSize(13);
  doc.text(
    ['is Accredited under the Human Kind Award framework', 'for its commitment to staff wellbeing.'],
    centre,
    afterName + 16,
    { align: 'center' },
  );

  doc.setFontSize(12);
  const dateLines = [`Accredited on ${formatCertificateDate(details.approvedAt)}`];
  if (details.validUntil) dateLines.push(`Valid until ${formatCertificateDate(details.validUntil)}`);
  doc.text(dateLines, centre, height - 45, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(...PURPLE);
  doc.text('humankindaward.com', centre, height - 25, { align: 'center' });

  doc.save(certificateFileName(details.organizationName));
}
