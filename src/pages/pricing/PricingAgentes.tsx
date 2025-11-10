import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import { DynamicBreadcrumbs } from '@/components/DynamicBreadcrumbs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { PlanCard } from '@/components/pricing/PlanCard';
import { PLANS, Plan } from '@/data/pricingPlans';

const PricingAgentes = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [isYearly, setIsYearly] = useState(false);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  const actionParam = searchParams.get('action');
  const agentPlans = PLANS.filter(p => p.category === 'agent');

  const handleSelectPlan = async (plan: Plan) => {
    if (!user) {
      navigate(`/auth?redirect=/pricing/agentes`);
      return;
    }

    setProcessingPlan(plan.id);

    try {
      toast({
        title: 'Próximamente',
        description: 'La integración de pagos estará disponible pronto',
      });
    } catch (error) {
      console.error('Error selecting plan:', error);
      toast({
        title: 'Error',
        description: 'Hubo un problema al procesar tu selección',
        variant: 'destructive',
      });
    } finally {
      setProcessingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <DynamicBreadcrumbs
          items={[
            { label: 'Inicio', href: '/', active: false },
            { label: 'Planes', href: '/pricing', active: false },
            { label: 'Agentes', href: '', active: true },
          ]}
          className="mb-4"
        />

        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Planes para Agentes Inmobiliarios
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              {actionParam === 'new_property'
                ? 'Selecciona un plan para comenzar a publicar propiedades'
                : 'Herramientas profesionales para tu negocio inmobiliario'}
            </p>

            <div className="flex flex-col items-center justify-center gap-3">
              <div className="flex items-center gap-4">
                <Label htmlFor="billing-toggle" className={!isYearly ? 'font-semibold' : ''}>
                  Mensual (sin compromiso)
                </Label>
                <Switch
                  id="billing-toggle"
                  checked={isYearly}
                  onCheckedChange={setIsYearly}
                />
                <Label htmlFor="billing-toggle" className={isYearly ? 'font-semibold' : ''}>
                  Ahorrar 12% (opcional)
                </Label>
              </div>
              <p className="text-sm text-muted-foreground max-w-md text-center">
                Puedes cancelar cuando quieras. El pago anual es opcional solo para quienes desean ahorrar.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {agentPlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isYearly={isYearly}
                onSelect={handleSelectPlan}
                isProcessing={processingPlan === plan.id}
                isAuthenticated={!!user}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PricingAgentes;
