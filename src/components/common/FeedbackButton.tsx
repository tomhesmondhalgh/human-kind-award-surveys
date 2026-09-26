
import React from "react";
import { HelpCircle } from "lucide-react";

const FEEDBACK_URL = "https://share-eu1.hsforms.com/2Hhykr4W_SF6sRIY1guaevA5kw04";

const FeedbackButton: React.FC = () => {
  return (
    <a
      href={FEEDBACK_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed z-50 bottom-6 right-4 sm:bottom-8 sm:right-8 bg-brandPurple-500 hover:bg-brandPurple-600 text-white shadow-lg px-4 py-3 rounded-full flex items-center gap-2 font-medium focus:outline-none focus:ring-2 focus:ring-brandPurple-300 transition-all"
      aria-label="Send website feedback (opens in new tab)"
      tabIndex={0}
    >
      <HelpCircle className="w-5 h-5" aria-hidden="true" />
      <span className="hidden sm:inline">Feedback</span>
      <span className="sm:hidden">Feedback</span>
    </a>
  );
};

export default FeedbackButton;
