import React, { ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import PlanFeatureItem from './PlanFeatureItem';

export type PlanType = 'free' | 'foundation' | 'progress' | 'premium' | 'legacy';

interface PlanCardProps {
  title: string;
  description: string;
  price: string;
  priceSubtext?: string;
  features: Array<{
    text: string;
    icon?: 'check' | 'trophy';
  }>;
  buttonText: string;
  buttonVariant: 'default' | 'outline';
  planType: PlanType;
  isPopular?: boolean;
  onButtonClick: () => void;
  disabled?: boolean;
}

const PlanCard: React.FC<PlanCardProps> = ({
  title,
  description,
  price,
  priceSubtext,
  features,
  buttonText,
  buttonVariant,
  isPopular,
  onButtonClick,
  disabled = false
}) => {
  return (
    <Card className={`relative ${isPopular 
      ? 'border-brandPurple-400 shadow-lg hover:shadow-xl transition-shadow duration-300 scale-105 z-10' 
      : 'border-brandPurple-200 hover:border-brandPurple-400 transition-colors duration-300'} flex flex-col`}>
      {isPopular && (
        <div className="absolute -top-4 left-0 right-0 flex justify-center">
          <span className="bg-brandPurple-600 text-white text-sm font-semibold px-3 py-1 rounded-full">
            Most Popular
          </span>
        </div>
      )}
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-xl font-bold text-brandPurple-700">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="text-center pt-4 flex-grow">
        <p className="text-3xl font-bold">{price}</p>
        <p className="text-sm text-gray-500 mb-6">{priceSubtext || '\u00A0'}</p>
        
        <ul className="text-left space-y-3 mb-6">
          {features.map((feature, index) => (
            <PlanFeatureItem key={index} text={feature.text} icon={feature.icon} />
          ))}
        </ul>
      </CardContent>
      <CardFooter className="mt-auto">
        <Button 
          onClick={onButtonClick} 
          className="w-full" 
          variant={buttonVariant}
          disabled={disabled}
        >
          {buttonText}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PlanCard;
