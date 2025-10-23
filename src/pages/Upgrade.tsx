
import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import PageContainer from '../components/layout/PageContainer';
import BenefitsSection from '../components/upgrade/BenefitsSection';
import WhyThisMattersSection from '../components/upgrade/WhyThisMattersSection';
import IntroSection from '../components/upgrade/IntroSection';
import HowItWorksSection from '../components/upgrade/HowItWorksSection';
import PricingSection from '../components/pricing/PricingSection';

const Upgrade = () => {
  const location = useLocation();

  // Ensure any stray dialogs are closed when this route is accessed
  useEffect(() => {
    const cleanupOverlays = () => {
      // Only dispatch an Escape key event to close any open dialogs
      // This is a safer approach than directly manipulating the DOM
      const escEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        code: 'Escape',
        keyCode: 27,
        which: 27,
        bubbles: true
      });
      document.dispatchEvent(escEvent);
      
      // Reset any body styles that might have been modified by dialogs
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
      document.body.removeAttribute('aria-hidden');
    };

    // Run cleanup when component mounts
    setTimeout(cleanupOverlays, 100); // Short delay to ensure component is fully mounted

    // Also run cleanup when location changes
    return () => {
      cleanupOverlays();
    };
  }, [location.pathname]);

  return (
    <MainLayout>
      <PageContainer className="space-y-16">
        {/* Hero Section */}
        <div className="-mx-6 -mt-6 md:-mx-8 md:-mt-8 px-6 md:px-8 py-16 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 rounded-t-lg">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Improving Staff Wellbeing Made Easy
            </h1>
            <p className="text-xl text-muted-foreground">
              Effective evidence-based strategies in an easy-to-use plan
            </p>
          </div>
        </div>
        
        <BenefitsSection />
        <WhyThisMattersSection />
        <IntroSection />
        <HowItWorksSection />
        <PricingSection />
      </PageContainer>
    </MainLayout>
  );
};

export default Upgrade;
