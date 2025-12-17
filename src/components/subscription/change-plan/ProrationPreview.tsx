import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Receipt, TrendingUp, TrendingDown, AlertCircle, Calendar, CreditCard } from 'lucide-react';
import { ProrationPreviewProps } from './types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function ProrationPreview({
  preview,
  loading,
  error,
  changeType,
  plans,
  currentPlanId,
  selectedPlanId,
  billingCycle,
  currentPeriodEnd,
}: ProrationPreviewProps) {
  if (loading) {
    return (
      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            Calculando cambio...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-8 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!preview || !selectedPlanId) {
    return null;
  }

  const currentPlan = plans.find(p => p.id === currentPlanId);
  const selectedPlan = plans.find(p => p.id === selectedPlanId);
  
  if (!currentPlan || !selectedPlan) return null;

  const getPrice = (plan: typeof currentPlan) => {
    return billingCycle === 'yearly' 
      ? (plan.price_yearly || plan.price_monthly * 12)
      : plan.price_monthly;
  };

  const newPrice = getPrice(selectedPlan);
  const billingCycleLabel = billingCycle === 'yearly' ? 'Anual' : 'Mensual';
  
  // Format currency values from cents to MXN
  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "d 'de' MMMM, yyyy", { locale: es });
    } catch {
      return dateString;
    }
  };

  return (
    <Card className="mt-4 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          {changeType === 'upgrade' ? (
            <>
              <TrendingUp className="w-4 h-4 text-green-600" />
              Resumen del Upgrade
            </>
          ) : changeType === 'downgrade' ? (
            <>
              <TrendingDown className="w-4 h-4 text-orange-600" />
              Resumen del Downgrade
            </>
          ) : (
            <>
              <Receipt className="w-4 h-4" />
              Resumen del Cambio
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Plan transition */}
        <div className="flex items-center justify-between text-sm bg-muted/50 rounded-lg p-3">
          <div className="text-muted-foreground">
            <span className="font-medium text-foreground">{currentPlan.display_name}</span>
            <span className="mx-2">→</span>
            <span className="font-medium text-primary">{selectedPlan.display_name}</span>
          </div>
        </div>

        {/* Billing cycle */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CreditCard className="w-4 h-4" />
          <span>Ciclo de facturación: <span className="font-medium text-foreground">{billingCycleLabel}</span></span>
        </div>

        {/* Proration breakdown for upgrades */}
        {changeType === 'upgrade' && (preview.current_plan_credit > 0 || preview.new_plan_price > 0) && (
          <div className="border-t border-b py-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Desglose del prorrateo</p>
            {preview.current_plan_credit > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Crédito plan actual (días restantes)</span>
                <span className="text-green-600 font-medium">-{formatCurrency(preview.current_plan_credit)}</span>
              </div>
            )}
            {preview.new_plan_price > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cargo nuevo plan (prorrateado)</span>
                <span className="font-medium">+{formatCurrency(preview.new_plan_price)}</span>
              </div>
            )}
          </div>
        )}

        {/* Immediate charge */}
        <div className="flex justify-between items-center pt-2">
          <span className="font-medium">
            {changeType === 'upgrade' ? 'Cargo inmediato:' : 'Ajuste:'}
          </span>
          <span className={`text-xl font-bold ${preview.immediate_charge > 0 ? 'text-primary' : 'text-green-600'}`}>
            {preview.immediate_charge > 0 ? '' : '-'}{formatCurrency(Math.abs(preview.immediate_charge))} MXN
          </span>
        </div>

        {/* Next renewal date */}
        {currentPeriodEnd && (
          <div className="flex items-center gap-2 text-sm bg-muted/30 rounded-lg p-3">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Próxima renovación: <span className="font-medium text-foreground">{formatDate(currentPeriodEnd)}</span>
            </span>
          </div>
        )}

        {/* Info messages */}
        {changeType === 'upgrade' && preview.immediate_charge > 0 && (
          <p className="text-xs text-muted-foreground">
            Se cobrará {formatCurrency(preview.immediate_charge)} MXN a tu método de pago actual.
            A partir de la renovación pagarás ${newPrice.toLocaleString('es-MX')}/{billingCycle === 'yearly' ? 'año' : 'mes'}.
          </p>
        )}

        {changeType === 'downgrade' && (
          <p className="text-xs text-muted-foreground">
            El cambio se aplicará al final de tu período de facturación actual.
            {preview.credit_amount > 0 && ` Recibirás un crédito de ${formatCurrency(preview.credit_amount)} MXN.`}
          </p>
        )}

        {changeType === 'cycle_change' && (
          <p className="text-xs text-muted-foreground">
            Tu nuevo ciclo de facturación {billingCycleLabel.toLowerCase()} se aplicará en la próxima renovación.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
