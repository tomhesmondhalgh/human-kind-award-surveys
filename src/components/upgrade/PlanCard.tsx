
import React, { ReactNode, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import PlanFeatureItem from './PlanFeatureItem';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import RedemptionCodeDialog from './RedemptionCodeDialog';

export type PlanType = 'free' | 'foundation' | 'progress' | 'premium';

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
  hasInvoiceOption?: boolean; 
  onInvoiceRequest?: () => void;
  onCardPayment?: () => void;
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
  disabled = false,
  hasInvoiceOption = false,
  onInvoiceRequest,
  onCardPayment
}) => {
  const [showRedemptionCodeDialog, setShowRedemptionCodeDialog] = useState(false);

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
        {hasInvoiceOption && onInvoiceRequest && onCardPayment ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={disabled}>
              <Button className="w-full" variant={buttonVariant}>
                <span className="flex items-center justify-between w-full">
                  {buttonText} <ChevronDown className="ml-2 h-4 w-4" />
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-56 bg-white">
              <DropdownMenuItem onClick={onCardPayment} className="cursor-pointer">
                Pay with Card
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onInvoiceRequest} className="cursor-pointer">
                Pay by Invoice
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowRedemptionCodeDialog(true)} className="cursor-pointer">
                Use Redemption Code
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button 
            onClick={onButtonClick} 
            className="w-full" 
            variant={buttonVariant}
            disabled={disabled}
          >
            {buttonText}
          </Button>
        )}
        
        <RedemptionCodeDialog 
          open={showRedemptionCodeDialog} 
          onOpenChange={setShowRedemptionCodeDialog} 
        />
      </CardFooter>
    </Card>
  );
};

export default PlanCard;
