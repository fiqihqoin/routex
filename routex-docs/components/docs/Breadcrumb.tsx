import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2 mb-6 text-sm">
      <Link 
        href="/" 
        className="text-text-dim hover:text-teal transition-colors"
      >
        <Home className="w-4 h-4" />
      </Link>
      
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        
        return (
          <div key={idx} className="flex items-center gap-2">
            <ChevronRight className="w-3.5 h-3.5 text-text-dim" />
            {isLast || !item.href ? (
              <span className="text-foreground font-medium underline decoration-teal/30 underline-offset-4 decoration-2">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-text-muted hover:text-teal hover:underline transition-all"
              >
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
