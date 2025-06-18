
import { toast as sonnerToast } from 'sonner';

/**
 * Unified toast service that wraps sonner functionality
 * Updated with shorter default durations for better UX
 */
export const toast = {
  success: (message: string | { title?: string; description?: string; duration?: number }) => {
    if (typeof message === 'string') {
      sonnerToast.success(message, {
        duration: 3000, // 3 seconds for success
      });
    } else {
      sonnerToast.success(message.title || 'Success', {
        description: message.description,
        duration: message.duration || 3000, // 3 seconds for success
      });
    }
  },
  
  error: (message: string | { title?: string; description?: string; duration?: number }) => {
    if (typeof message === 'string') {
      sonnerToast.error(message, {
        duration: 5000, // 5 seconds for errors (keep longer)
      });
    } else {
      sonnerToast.error(message.title || 'Error', {
        description: message.description,
        duration: message.duration || 5000, // 5 seconds for errors
      });
    }
  },
  
  info: (message: string | { title?: string; description?: string; duration?: number }) => {
    if (typeof message === 'string') {
      sonnerToast.info(message, {
        duration: 3000, // 3 seconds for info
      });
    } else {
      sonnerToast.info(message.title || 'Info', {
        description: message.description,
        duration: message.duration || 3000, // 3 seconds for info
      });
    }
  },
  
  warning: (message: string | { title?: string; description?: string; duration?: number }) => {
    if (typeof message === 'string') {
      sonnerToast.warning(message, {
        duration: 4000, // 4 seconds for warnings
      });
    } else {
      sonnerToast.warning(message.title || 'Warning', {
        description: message.description,
        duration: message.duration || 4000, // 4 seconds for warnings
      });
    }
  },
};
