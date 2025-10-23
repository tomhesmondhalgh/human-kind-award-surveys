
import React from 'react';
import { Award, Play, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      number: 1,
      icon: Award,
      title: "Gain Accreditation",
      description: "Assess your current state and benchmark against best practices in staff wellbeing",
      colorClass: "bg-blue-100 text-blue-600"
    },
    {
      number: 2,
      icon: Play,
      title: "Get Started",
      description: "Access the framework and action planning tools to implement evidence-based strategies",
      colorClass: "bg-purple-100 text-purple-600"
    },
    {
      number: 3,
      icon: Users,
      title: "Meet Your Coach",
      description: "Higher tier members receive ongoing support from dedicated coaches to accelerate progress",
      colorClass: "bg-green-100 text-green-600"
    }
  ];

  return (
    <div>
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          How the Process Works
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          We guide you through our evidence-based framework step by step
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 relative">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={index} className="relative">
              <Card className="border-2 h-full">
                <CardContent className="pt-6 text-center">
                  <div className="relative inline-block mb-4">
                    <div className={`w-16 h-16 rounded-full ${step.colorClass} flex items-center justify-center`}>
                      <Icon className="h-8 w-8" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-foreground text-background rounded-full flex items-center justify-center font-bold text-sm">
                      {step.number}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
              
              {/* Arrow connector for desktop */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 16H26M26 16L20 10M26 16L20 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"/>
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HowItWorksSection;
