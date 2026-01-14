import { useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

export const Notification = ({ message, type, onClose }: NotificationProps) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: CheckCircle,
    error: XCircle,
    info: Info,
  };

  const Icon = icons[type];

  return (
    <div
      className={cn(
        "fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg",
        "animate-in slide-in-from-top-2 fade-in duration-300",
        type === 'success' && "bg-success/20 border border-success/50 neon-border-green",
        type === 'error' && "bg-destructive/20 border border-destructive/50 neon-border-red",
        type === 'info' && "bg-primary/20 border border-primary/50 neon-border-cyan"
      )}
    >
      <Icon className={cn(
        "w-5 h-5",
        type === 'success' && "text-success",
        type === 'error' && "text-destructive",
        type === 'info' && "text-primary"
      )} />
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 text-muted-foreground hover:text-foreground">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
