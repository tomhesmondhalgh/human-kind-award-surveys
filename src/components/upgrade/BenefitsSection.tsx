
import React from 'react';
import { Heart, Users, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const BenefitsSection: React.FC = () => {
  const benefits = [
    {
      icon: Heart,
      title: "Show Staff You Value Them",
      description: "Demonstrate genuine commitment to staff wellbeing with evidence-based strategies",
      colorClass: "bg-green-100 text-green-600"
    },
    {
      icon: Users,
      title: "Keep Your Best Staff",
      description: "Reduce turnover by creating a supportive and engaging workplace culture",
      colorClass: "bg-blue-100 text-blue-600"
    },
    {
      icon: TrendingDown,
      title: "Save Money on Recruitment",
      description: "Lower costs by retaining experienced staff and reducing hiring needs",
      colorClass: "bg-purple-100 text-purple-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {benefits.map((benefit, index) => {
        const Icon = benefit.icon;
        return (
          <Card 
            key={index} 
            className="border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
          >
            <CardContent className="pt-6 text-center">
              <div className={`w-16 h-16 rounded-full ${benefit.colorClass} flex items-center justify-center mx-auto mb-4`}>
                <Icon className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">
                {benefit.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {benefit.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default BenefitsSection;
