import { toastService } from './toast-service';

export const notify = {
  success: (message: string) => toastService.success(message),
  error: (message: string) => toastService.error(message),
  loading: (message: string = 'Processing...') => toastService.loading(message),
  dismiss: () => {} // No-op since our toasts auto-dismiss
};
