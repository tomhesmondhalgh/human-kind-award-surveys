
import React from 'react';

const IntroSection: React.FC = () => {
  return (
    <div className="max-w-4xl bg-muted/30 rounded-lg border-2 border-border p-8">
      <h2 className="text-2xl font-bold text-foreground mb-6">
        The Human Kind Award Framework
      </h2>
      
      <p className="text-lg leading-relaxed text-foreground mb-4">
        Now you know the challenges staff face in your organisation, and the areas they'd like to change, 
        how do you go about making that change happen? <span className="font-semibold">The Human Kind Award framework is a detailed set 
        of 59 strategies</span> you can use in your organisation to improve staff wellbeing.
      </p>
      
      <p className="text-lg leading-relaxed text-foreground">
        Sign up for our <span className="font-semibold">Foundation package</span> below to access the Human Kind Framework and action planning 
        tool online, or sign up for one of our more complete packages to access a huge range of support 
        alongside it - to help you meet your goals faster.
      </p>
    </div>
  );
};

export default IntroSection;
