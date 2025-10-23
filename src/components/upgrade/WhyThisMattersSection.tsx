
import React from 'react';
import { AlertCircle, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const WhyThisMattersSection: React.FC = () => {
  const reasons = [
    {
      icon: AlertCircle,
      title: "Your Staff Need Support Now",
      description: "Staff who are most at risk according to your survey don't feel you support their wellbeing and may look elsewhere to work. Taking action shows you're listening and care about their future.",
      colorClass: "bg-red-100 text-red-600"
    },
    {
      icon: TrendingUp,
      title: "Stop the Costly Cycle",
      description: "Constantly recruiting people—particularly teachers—means you're losing time and money. Everyone's organisation thrives on the success of its people. Invest in retention, not replacement.",
      colorClass: "bg-green-100 text-green-600"
    }
  ];

  return (
    <div>
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          Why is a Focus on Staff Wellbeing So Important?
        </h2>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          Your survey has revealed the challenges. Now it's time to act before it's too late.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reasons.map((reason, index) => {
          const Icon = reason.icon;
          return (
            <Card 
              key={index}
              className="border-2 hover:shadow-lg transition-all duration-300"
            >
              <CardContent className="pt-6">
                <div className={`w-14 h-14 rounded-full ${reason.colorClass} flex items-center justify-center mb-4`}>
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">
                  {reason.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {reason.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default WhyThisMattersSection;
