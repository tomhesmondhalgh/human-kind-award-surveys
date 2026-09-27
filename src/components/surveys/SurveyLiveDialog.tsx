import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { Check, Copy, Download, Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { buildStaffEmail } from '@/utils/survey/shareText';

export interface LiveSurveyInfo {
  id: string;
  name: string;
  closeDate?: string | null;
  distributionMethod: 'link' | 'email';
  /** Number of invitations the email function reported sending. */
  invitationsSent?: number | null;
  /** True when publishing succeeded but sending the invitations failed. */
  emailFailed?: boolean;
}

interface SurveyLiveDialogProps {
  survey: LiveSurveyInfo | null;
  schoolName?: string | null;
  onClose: () => void;
}

const SurveyLiveDialog: React.FC<SurveyLiveDialogProps> = ({ survey, schoolName, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<'link' | 'email' | null>(null);

  const surveyUrl = survey ? `${window.location.origin}/survey/${survey.id}` : '';

  const email = useMemo(
    () => buildStaffEmail({ surveyUrl, closeDate: survey?.closeDate, schoolName }),
    [surveyUrl, survey?.closeDate, schoolName]
  );

  useEffect(() => {
    if (!surveyUrl) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(surveyUrl, { width: 480, margin: 2 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch((error) => {
        console.error('Error generating QR code:', error);
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [surveyUrl]);

  const copy = async (text: string, what: 'link' | 'email') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      toast.success(what === 'link' ? 'Survey link copied' : 'Email text copied');
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Could not copy. Please select the text and copy it manually.');
    }
  };

  const isEmail = survey?.distributionMethod === 'email';
  const emailText = `Subject: ${email.subject}\n\n${email.body}`;

  return (
    <Dialog open={!!survey} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Your survey is live</DialogTitle>
          <DialogDescription>
            {survey?.name ? `"${survey.name}" is now open for responses.` : 'Your survey is now open for responses.'}
          </DialogDescription>
        </DialogHeader>

        {isEmail && !survey?.emailFailed && (
          <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            <Mail className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              {survey?.invitationsSent
                ? `We've emailed invitations to ${survey.invitationsSent} ${survey.invitationsSent === 1 ? 'person' : 'people'}.`
                : "We've emailed the invitations."}{' '}
              You can also share the link or QR code below with anyone who didn't get one.
            </span>
          </div>
        )}

        {isEmail && survey?.emailFailed && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            The survey is live, but the email invitations couldn't be sent. Share the link below instead, or try
            the Remind button on the Surveys page.
          </div>
        )}

        <section className="space-y-2">
          <h3 className="text-sm font-medium text-gray-900">1. Share the link</h3>
          <div className="flex gap-2">
            <Input readOnly value={surveyUrl} onFocus={(e) => e.target.select()} aria-label="Survey link" />
            <Button type="button" variant="outline" onClick={() => copy(surveyUrl, 'link')} className="flex-shrink-0">
              {copied === 'link' ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
              {copied === 'link' ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-medium text-gray-900">2. Or put the QR code on a slide or poster</h3>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR code linking to the survey"
                className="h-40 w-40 rounded border border-gray-200 bg-white"
              />
            ) : (
              <div className="h-40 w-40 rounded border border-dashed border-gray-200" aria-hidden="true" />
            )}
            {qrDataUrl && (
              <Button type="button" variant="outline" asChild>
                <a href={qrDataUrl} download="survey-qr-code.png">
                  <Download className="mr-1 h-4 w-4" />
                  Download QR code
                </a>
              </Button>
            )}
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-medium text-gray-900">3. Send your staff an email</h3>
          <p className="text-sm text-gray-600">Here's some suggested text you can copy into your own email.</p>
          <Textarea readOnly value={emailText} rows={12} className="text-sm" aria-label="Suggested email text" />
          <Button type="button" variant="outline" onClick={() => copy(emailText, 'email')}>
            {copied === 'email' ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
            {copied === 'email' ? 'Copied' : 'Copy email text'}
          </Button>
        </section>

        <DialogFooter>
          <Button type="button" onClick={onClose} className="bg-brandPurple-500 hover:bg-brandPurple-600">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SurveyLiveDialog;
