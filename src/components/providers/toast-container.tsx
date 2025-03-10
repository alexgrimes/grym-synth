
'use client';

import { Toaster } from 'react-hot-toast';

export function ToastContainer() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        className: 'bg-background text-foreground',
        duration: 3000,
        style: {
          background: '#333',
          color: '#fff',
          padding: '12px',
          borderRadius: '8px',
        },
      }}
    />
  );
}
