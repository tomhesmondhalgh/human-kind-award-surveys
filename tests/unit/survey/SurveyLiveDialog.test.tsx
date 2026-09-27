import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SurveyLiveDialog from '@/components/surveys/SurveyLiveDialog';

vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,AAAA') },
}));

describe('SurveyLiveDialog', () => {
  it('shows the link, QR code and email text for a link survey', async () => {
    render(
      <SurveyLiveDialog
        survey={{ id: 'abc', name: 'Autumn check-in', distributionMethod: 'link' }}
        schoolName="Oak Primary"
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Your survey is live')).toBeInTheDocument();
    expect(screen.getByLabelText('Survey link')).toHaveValue(`${window.location.origin}/survey/abc`);
    expect(await screen.findByAltText('QR code linking to the survey')).toBeInTheDocument();
    expect((screen.getByLabelText('Suggested email text') as HTMLTextAreaElement).value).toContain('anonymous');
  });

  it('confirms how many invitations were emailed', () => {
    render(
      <SurveyLiveDialog
        survey={{ id: 'abc', name: 'Autumn', distributionMethod: 'email', invitationsSent: 12 }}
        onClose={() => {}}
      />
    );
    expect(screen.getByText(/emailed invitations to 12 people/)).toBeInTheDocument();
  });

  it('says so when the invitations failed to send', () => {
    render(
      <SurveyLiveDialog
        survey={{ id: 'abc', name: 'Autumn', distributionMethod: 'email', emailFailed: true }}
        onClose={() => {}}
      />
    );
    expect(screen.getByText(/couldn't be sent/)).toBeInTheDocument();
  });
});
