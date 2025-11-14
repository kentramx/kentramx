import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FunnelStep {
  number: number;
  label: string;
  completed: boolean;
  current: boolean;
}

interface FunnelProgressProps {
  steps: FunnelStep[];
  className?: string;
}

export const FunnelProgress = ({ steps, className }: FunnelProgressProps) => {
  return (
    <div className={cn("w-full max-w-3xl mx-auto py-8", className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center flex-1">
            {/* Step Circle */}
            <div className="flex flex-col items-center relative">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all",
                  step.completed
                    ? "bg-primary text-primary-foreground"
                    : step.current
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {step.completed ? (
                  <Check className="h-5 w-5" />
                ) : (
                  step.number
                )}
              </div>
              
              {/* Step Label */}
              <span
                className={cn(
                  "text-xs mt-2 text-center max-w-[80px] transition-all",
                  step.current
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1 mx-2 transition-all",
                  step.completed
                    ? "bg-primary"
                    : "bg-muted"
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
