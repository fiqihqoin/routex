import { Info, AlertTriangle, AlertOctagon, Lightbulb } from 'lucide-react';

interface CalloutProps {
  type?: 'info' | 'warning' | 'danger' | 'tip';
  title?: string;
  children: React.ReactNode;
}

export default function Callout({ type = 'info', title, children }: CalloutProps) {
  const styles = {
    info: {
      border: 'border-teal',
      bg: 'bg-teal/8',
      icon: <Info className="w-5 h-5 text-teal" />,
      text: 'text-teal',
    },
    warning: {
      border: 'border-amber-500',
      bg: 'bg-amber-500/8',
      icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
      text: 'text-amber-500',
    },
    danger: {
      border: 'border-red-500',
      bg: 'bg-red-500/8',
      icon: <AlertOctagon className="w-5 h-5 text-red-500" />,
      text: 'text-red-500',
    },
    tip: {
      border: 'border-purple',
      bg: 'bg-purple/8',
      icon: <Lightbulb className="w-5 h-5 text-purple" />,
      text: 'text-purple',
    },
  };

  const style = styles[type];

  return (
    <div className={`my-6 flex gap-4 p-5 rounded-xl border-l-[4px] bg-background shadow-card ${style.border} ${style.bg.replace('bg-', 'before:bg-')}`}>
      <div className="mt-0.5 shrink-0">{style.icon}</div>
      <div className="flex-1 min-w-0">
        {title && (
          <h5 className={`font-bold mb-1.5 ${style.text}`}>{title}</h5>
        )}
        <div className="text-sm text-text-muted leading-relaxed prose-sm prose-slate dark:prose-invert">
          {children}
        </div>
      </div>
    </div>
  );
}
