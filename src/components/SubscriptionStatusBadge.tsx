import { CheckCircle2, XCircle, AlertCircle, Clock, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface SubscriptionStatusBadgeProps {
  status: string | null;
  currentPeriodEnd?: string | null;
  className?: string;
  showLabel?: boolean;
}

const statusConfig = {
  active: {
    label: "Suscripción Activa",
    icon: CheckCircle2,
    variant: "default" as const,
    className: "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20",
    tooltip: "Tu suscripción está activa y funcionando correctamente"
  },
  canceled: {
    label: "Suscripción Cancelada",
    icon: XCircle,
    variant: "destructive" as const,
    className: "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20",
    tooltip: "Tu suscripción ha sido cancelada. Reactívala para continuar"
  },
  past_due: {
    label: "Pago Pendiente",
    icon: AlertCircle,
    variant: "default" as const,
    className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20 hover:bg-yellow-500/20",
    tooltip: "Tu último pago falló. Actualiza tu método de pago para reactivar"
  },
  trialing: {
    label: "Período de Prueba",
    icon: Clock,
    variant: "secondary" as const,
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20",
    tooltip: "Estás en período de prueba gratuito"
  },
  expired: {
    label: "Período Expirado",
    icon: XCircle,
    variant: "destructive" as const,
    className: "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20",
    tooltip: "Tu período de prueba ha expirado. Contrata un plan para continuar"
  },
  none: {
    label: "Sin Suscripción",
    icon: AlertTriangle,
    variant: "outline" as const,
    className: "bg-muted/50 text-muted-foreground border-border hover:bg-muted",
    tooltip: "No tienes una suscripción activa. Contrata un plan para publicar propiedades"
  }
};

export function SubscriptionStatusBadge({ 
  status, 
  currentPeriodEnd,
  className,
  showLabel = true
}: SubscriptionStatusBadgeProps) {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.none;
  const Icon = config.icon;

  const formatDate = (date: string | null | undefined) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const content = (
    <Badge 
      variant={config.variant}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 font-medium transition-colors",
        config.className,
        className
      )}
    >
      <Icon className="h-4 w-4" />
      {showLabel && <span>{config.label}</span>}
      {status === 'active' && currentPeriodEnd && (
        <span className="text-xs opacity-70">
          · Renueva {formatDate(currentPeriodEnd)}
        </span>
      )}
      {status === 'trialing' && currentPeriodEnd && (
        <span className="text-xs opacity-70">
          · Expira {formatDate(currentPeriodEnd)}
        </span>
      )}
    </Badge>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{config.tooltip}</p>
          {currentPeriodEnd && status === 'active' && (
            <p className="text-xs text-muted-foreground mt-1">
              Tu siguiente factura se generará el {formatDate(currentPeriodEnd)}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
