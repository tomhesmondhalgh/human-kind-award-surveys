
import { toast as sonnerToast } from 'sonner';

/**
 * Unified toast service that wraps sonner functionality
 */
export const toast = {
  success: (message: string | { title?: string; description?: string; duration?: number }) => {
    if (typeof message === 'string') {
      sonnerToast.success(message, {
        duration: 5000,
      });
    } else {
      sonnerToast.success(message.title || 'Success', {
        description: message.description,
        duration: message.duration || 5000,
      });
    }
  },
  
  error: (message: string | { title?: string; description?: string; duration?: number }) => {
    if (typeof message === 'string') {
      sonnerToast.error(message, {
        duration: 5000,
      });
    } else {
      sonnerToast.error(message.title || 'Error', {
        description: message.description,
        duration: message.duration || 5000,
      });
    }
  },
  
  info: (message: string | { title?: string; description?: string; duration?: number }) => {
    if (typeof message === 'string') {
      sonnerToast.info(message, {
        duration: 5000,
      });
    } else {
      sonnerToast.info(message.title || 'Info', {
        description: message.description,
        duration: message.duration || 5000,
      });
    }
  },
  
  warning: (message: string | { title?: string; description?: string; duration?: number }) => {
    if (typeof message === 'string') {
      sonnerToast.warning(message, {
        duration: 5000,
      });
    } else {
      sonnerToast.warning(message.title || 'Warning', {
        description: message.description,
        duration: message.duration || 5000,
      });
    }
  },
};
