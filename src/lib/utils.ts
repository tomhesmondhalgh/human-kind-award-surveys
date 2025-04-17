
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as currency
 * @param amount The amount to format
 * @param currency The currency code (default: 'GBP')
 * @param convertFromSmallestUnit Whether to convert from the smallest unit (e.g. pence to pounds)
 */
export function formatCurrency(
  amount: number, 
  currency: string = 'GBP', 
  convertFromSmallestUnit: boolean = false
): string {
  // If the amount appears to be in the smallest unit (pence/cents) and convertFromSmallestUnit is true
  // For GBP values, typical prices would be below 10000 (£10,000) for most products
  const valueToFormat = convertFromSmallestUnit && amount > 10000 ? amount / 100 : amount;
  
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency || 'GBP',
    minimumFractionDigits: 2
  }).format(valueToFormat);
}
