type ToastType = 'success' | 'error' | 'loading';

interface ToastEvent {
  message: string;
  type: ToastType;
}

type ToastCallback = (event: ToastEvent) => void;

class ToastService {
  private listeners: ToastCallback[] = [];

  subscribe(callback: ToastCallback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private emit(event: ToastEvent) {
    this.listeners.forEach(callback => callback(event));
  }

  success(message: string) {
    this.emit({ message, type: 'success' });
    return message;
  }

  error(message: string) {
    this.emit({ message, type: 'error' });
    return message;
  }

  loading(message: string = 'Processing...') {
    this.emit({ message, type: 'loading' });
    return message;
  }

  dismiss() {} // No-op since our toasts auto-dismiss
}

export const toastService = new ToastService();
