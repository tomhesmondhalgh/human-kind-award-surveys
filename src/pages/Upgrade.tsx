
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
    const cleanupOverlays = () => {
      // Approach 1: Force close using Escape key simulation
      const escEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        code: 'Escape',
        keyCode: 27,
        which: 27,
        bubbles: true
      });
      document.dispatchEvent(escEvent);

      // Approach 2: Try to directly find and remove any blocking elements
      const potentialBlockers = document.querySelectorAll(
        '[data-radix-portal], [data-radix-overlay], [data-radix-focus-guard], [role="dialog"]'
      );
      
      potentialBlockers.forEach(element => {
        if (element.parentElement) {
          element.parentElement.removeChild(element);
        }
      });

      // Approach 3: Remove any elements that might be capturing events
      const bodyChildren = document.body.children;
      for (let i = 0; i < bodyChildren.length; i++) {
        const child = bodyChildren[i];
        if (child.id?.includes('radix') || 
            child.classList?.contains('fixed') || 
            child.hasAttribute('aria-hidden')) {
          document.body.removeChild(child);
        }
      }

      // Approach 4: Reset body styles that might have been added
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
      document.body.removeAttribute('aria-hidden');
      
      // Ensure dialogs are closed by clicking any close buttons
      const closeButtons = document.querySelectorAll('[aria-label="Close"]');
      closeButtons.forEach(button => {
        if (button instanceof HTMLElement) {
          button.click();
        }
      });
    };

    // Run cleanup when component mounts
    cleanupOverlays();

    // Also run cleanup when location changes
    return () => {
      cleanupOverlays();
    };
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
