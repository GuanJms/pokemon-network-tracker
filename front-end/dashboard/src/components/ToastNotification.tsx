import React, { useEffect } from 'react';

interface Toast {
  id: string;
  message: string;
}

interface Props {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const ToastNotification: React.FC<Props> = ({ toasts, onRemove }) => {
  useEffect(() => {
    const timers = toasts.map(t => setTimeout(() => onRemove(t.id), 1000));
    return () => timers.forEach(clearTimeout);
  }, [toasts, onRemove]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-2 z-50">
      {toasts.map(t => (
        <div key={t.id} className="bg-pixel-dark border-4 border-pixel-border text-pixel-green px-4 py-2 text-xs font-mono shadow-lg animate-slide-up">
          {t.message}
        </div>
      ))}
    </div>
  );
};

export default ToastNotification; 