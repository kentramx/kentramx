import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import { DynamicBreadcrumbs } from '@/components/DynamicBreadcrumbs';
import { useToast } from '@/hooks/use-toast';
import { PlanCard } from '@/components/pricing/PlanCard';
import { PLANS, Plan } from '@/data/pricingPlans';

const PricingDesarrolladoras = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  const developerPlans = PLANS.filter(p => p.category === 'developer');

  const handleSelectPlan = async (plan: Plan) => {
    if (!user) {
      navigate(`/auth?redirect=/pricing/desarrolladoras`);
      return;
    }

    setProcessingPlan(plan.id);

    try {
      toast({
        title: 'Plan Personalizado',
        description: 'Contáctanos para obtener una cotización personalizada',
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
            { label: 'Desarrolladoras', href: '', active: true },
          ]}
          className="mb-4"
        />

        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Plan para Desarrolladoras
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Solución empresarial para proyectos de gran escala
            </p>
          </div>

          <div className="max-w-md mx-auto">
            {developerPlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isYearly={false}
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

export default PricingDesarrolladoras;
