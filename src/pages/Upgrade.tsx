
import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import PageTitle from '../components/ui/PageTitle';
import BenefitsSection from '../components/upgrade/BenefitsSection';
import IntroSection from '../components/upgrade/IntroSection';
import PricingSection from '../components/upgrade/PricingSection';

const Upgrade = () => {
  const location = useLocation();

  // Ensure any stray dialogs are closed when this route is accessed
  useEffect(() => {
    // Force any modal dialogs to close by clicking on any potential overlays
    const overlays = document.querySelectorAll('[data-radix-overlay]');
    if (overlays.length > 0) {
      overlays.forEach(overlay => {
        // Simulate an Escape key press to close any open dialogs
        const escEvent = new KeyboardEvent('keydown', {
          key: 'Escape',
          code: 'Escape',
          keyCode: 27,
          which: 27,
          bubbles: true
        });
        document.dispatchEvent(escEvent);
      });
    }
  }, [location.pathname]);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <PageTitle 
          title="Improving Staff Wellbeing Made Easy" 
          subtitle="Effective evidence-based strategies in an easy-to-use plan" 
          alignment="center" 
        />
        
        <BenefitsSection />
        <IntroSection />
        <PricingSection />
      </div>
    </MainLayout>
  );
};

export default Upgrade;
