
import { toast as sonnerToast } from 'sonner';

type ToastOptions = {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
};

/**
 * Unified toast service that wraps sonner functionality
 */
export const toast = {
  success: (options: ToastOptions) => {
    sonnerToast.success(options.title || 'Success', {
      description: options.description,
      duration: options.duration || 5000,
    });
  },
  
  error: (options: ToastOptions) => {
    sonnerToast.error(options.title || 'Error', {
      description: options.description,
      duration: options.duration || 5000,
    });
  },
  
  info: (options: ToastOptions) => {
    sonnerToast.info(options.title || 'Info', {
      description: options.description,
      duration: options.duration || 5000,
    });
  },
  
  warning: (options: ToastOptions) => {
    sonnerToast.warning(options.title || 'Warning', {
      description: options.description,
      duration: options.duration || 5000,
    });
  },
};
