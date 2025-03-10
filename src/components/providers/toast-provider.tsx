'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { CheckIcon, ErrorIcon, LoadingIcon } from '@/components/ui/icons';
import { toastService } from '@/lib/toast-service';

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'loading';
}

const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = React.useState<ToastMessage[]>([]);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted) return;

    const unsubscribe = toastService.subscribe(({ message, type }) => {
      const id = Math.random().toString(36).slice(2);
      setMessages((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setMessages((prev) => prev.filter((m) => m.id !== id));
      }, type === 'error' ? 4000 : 3000);
    });

    return () => unsubscribe();
  }, [mounted]);

  if (!mounted) return null;

  return (
    <>
      {children}
      {mounted &&
        createPortal(
          <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-lg px-4 py-3 text-white shadow-lg 
                  animate-in slide-in-from-right duration-300 
                  transition-all hover:translate-x-[-4px] cursor-pointer
                  ${
                    msg.type === 'success' ? 'bg-green-600 hover:bg-green-700' : 
                    msg.type === 'error' ? 'bg-red-600 hover:bg-red-700' : 
                    'bg-blue-600 hover:bg-blue-700'
                  }`}
                onClick={() => {
                  setMessages(prev => prev.filter(m => m.id !== msg.id));
                }}
              >
                <div className="flex items-center gap-2">
                  {msg.type === 'success' ? (
                    <CheckIcon />
                  ) : msg.type === 'error' ? (
                    <ErrorIcon />
                  ) : (
                    <LoadingIcon />
                  )}
                  {msg.message}
                </div>
              </div>
            ))}
          </div>,
          document.body
        )}
    </>
  );
};

export default ToastProvider;
