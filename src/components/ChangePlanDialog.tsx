import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, TrendingUp, TrendingDown, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChangePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlanId: string;
  currentPlanName: string;
  currentBillingCycle: string;
  onSuccess: () => void;
}

interface Plan {
  id: string;
  name: string;
  display_name: string;
  price_monthly: number;
  price_yearly: number;
  features: any;
}

export const ChangePlanDialog = ({
  open,
  onOpenChange,
  currentPlanId,
  currentPlanName,
  currentBillingCycle,
  onSuccess,
}: ChangePlanDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(
    currentBillingCycle as 'monthly' | 'yearly'
  );

  useEffect(() => {
    if (open) {
      fetchAvailablePlans();
    }
  }, [open, currentPlanName]);

  const fetchAvailablePlans = async () => {
    try {
      setLoading(true);
      
      // Determinar el tipo de planes a mostrar según el plan actual
      const planType = currentPlanName.toLowerCase().includes('inmobiliaria') 
        ? 'inmobiliaria' 
        : 'agente';

      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .ilike('name', `%${planType}%`)
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      if (error) throw error;

      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los planes disponibles',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePlan = async () => {
    if (!selectedPlanId) {
      toast({
        title: 'Error',
        description: 'Por favor selecciona un plan',
        variant: 'destructive',
      });
      return;
    }

    if (selectedPlanId === currentPlanId && billingCycle === currentBillingCycle) {
      toast({
        title: 'Sin cambios',
        description: 'Ya tienes este plan y ciclo de facturación',
      });
      return;
    }

    setProcessing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const response = await supabase.functions.invoke('change-subscription-plan', {
        body: {
          newPlanId: selectedPlanId,
          billingCycle: billingCycle,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw response.error;

      toast({
        title: '¡Plan actualizado!',
        description: 'Tu plan se ha cambiado exitosamente. Los cambios se reflejarán en tu próxima factura.',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error changing plan:', error);
      toast({
        title: 'Error al cambiar de plan',
        description: error instanceof Error ? error.message : 'Intenta de nuevo más tarde',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const getChangeType = (planId: string) => {
    const currentPlan = plans.find(p => p.id === currentPlanId);
    const newPlan = plans.find(p => p.id === planId);
    
    if (!currentPlan || !newPlan) return null;

    const currentPrice = currentBillingCycle === 'yearly' 
      ? currentPlan.price_yearly 
      : currentPlan.price_monthly;
    
    const newPrice = billingCycle === 'yearly' 
      ? newPlan.price_yearly 
      : newPlan.price_monthly;

    if (newPrice > currentPrice) return 'upgrade';
    if (newPrice < currentPrice) return 'downgrade';
    return 'change';
  };

  const getPlanPrice = (plan: Plan) => {
    return billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cambiar Plan de Suscripción</DialogTitle>
          <DialogDescription>
            Selecciona tu nuevo plan. Los cambios se aplicarán inmediatamente con prorrateo automático.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Billing Cycle Toggle */}
            <div className="flex items-center justify-center gap-4 p-4 bg-muted rounded-lg">
              <Label className="text-sm font-medium">Ciclo de facturación:</Label>
              <RadioGroup
                value={billingCycle}
                onValueChange={(value) => setBillingCycle(value as 'monthly' | 'yearly')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="monthly" id="monthly" />
                  <Label htmlFor="monthly" className="cursor-pointer">Mensual</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yearly" id="yearly" />
                  <Label htmlFor="yearly" className="cursor-pointer">
                    Anual <Badge variant="secondary" className="ml-2">-12%</Badge>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Plans List */}
            <RadioGroup value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <div className="space-y-3">
                {plans.map((plan) => {
                  const isCurrentPlan = plan.id === currentPlanId;
                  const changeType = getChangeType(plan.id);
                  const price = getPlanPrice(plan);

                  return (
                    <div
                      key={plan.id}
                      className={`relative flex items-start gap-4 p-4 border-2 rounded-lg transition-all cursor-pointer hover:border-primary/50 ${
                        selectedPlanId === plan.id ? 'border-primary bg-primary/5' : 'border-border'
                      } ${isCurrentPlan ? 'bg-muted' : ''}`}
                      onClick={() => setSelectedPlanId(plan.id)}
                    >
                      <RadioGroupItem value={plan.id} id={plan.id} className="mt-1" />
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Label htmlFor={plan.id} className="text-lg font-semibold cursor-pointer">
                            {plan.display_name}
                          </Label>
                          {isCurrentPlan && (
                            <Badge variant="outline" className="text-xs">
                              <Check className="h-3 w-3 mr-1" />
                              Plan Actual
                            </Badge>
                          )}
                          {!isCurrentPlan && changeType === 'upgrade' && (
                            <Badge className="bg-green-600 text-xs">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Upgrade
                            </Badge>
                          )}
                          {!isCurrentPlan && changeType === 'downgrade' && (
                            <Badge variant="secondary" className="text-xs">
                              <TrendingDown className="h-3 w-3 mr-1" />
                              Downgrade
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-2xl font-bold">
                            ${price.toLocaleString('es-MX')} MXN
                          </span>
                          <span className="text-sm text-muted-foreground">
                            /{billingCycle === 'yearly' ? 'año' : 'mes'}
                          </span>
                        </div>

                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">Incluye:</span>{' '}
                          {plan.features?.properties_limit === -1 
                            ? 'Propiedades ilimitadas' 
                            : `${plan.features?.properties_limit} propiedades activas`}
                          {plan.features?.featured_limit > 0 && 
                            `, ${plan.features.featured_limit} destacada${plan.features.featured_limit > 1 ? 's' : ''}`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </RadioGroup>

            {/* Proration Notice */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>💡 Prorrateo automático:</strong> Si cambias a un plan más caro, solo pagarás 
                la diferencia prorrateada por el tiempo restante. Si cambias a un plan más económico, 
                el crédito se aplicará a tu próxima factura.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={processing}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleChangePlan}
            disabled={processing || !selectedPlanId || loading}
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Procesando...
              </>
            ) : (
              'Cambiar Plan'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
