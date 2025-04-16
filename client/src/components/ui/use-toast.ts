import { useState, useEffect, ReactNode } from 'react';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  action?: ReactNode;
  variant?: 'default' | 'destructive';
}

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setToasts((prevToasts) => {
        if (prevToasts.length === 0) {
          return prevToasts;
        }
        return prevToasts.slice(1);
      });
    }, 5000);

    return () => {
      clearTimeout(timer);
    };
  }, [toasts]);

  const toast = ({
    title,
    description,
    action,
    variant = 'default',
  }: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prevToasts) => [
      ...prevToasts,
      { id, title, description, action, variant },
    ]);
    return id;
  };

  const dismiss = (id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  return {
    toast,
    dismiss,
    toasts,
  };
};

export type ToastProps = Toast & {
  onDismiss: (id: string) => void;
};
