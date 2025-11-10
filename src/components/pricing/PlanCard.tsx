import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  display_name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  category: 'agent' | 'agency' | 'developer';
  features: string[];
  is_popular?: boolean;
  custom_price?: boolean;
}

interface PlanCardProps {
  plan: Plan;
  isYearly: boolean;
  onSelect: (plan: Plan) => void;
  isProcessing: boolean;
  isAuthenticated: boolean;
}

export const PlanCard = ({ plan, isYearly, onSelect, isProcessing, isAuthenticated }: PlanCardProps) => {
  const getPlanPrice = () => {
    if (plan.custom_price) return 'Desde $18,000/mes';
    return `$${plan.price_monthly.toLocaleString('es-MX')}/mes`;
  };

  const getYearlyPriceDisplay = () => {
    if (plan.price_yearly === 0 || plan.custom_price) return null;
    const monthlyEquivalent = Math.round(plan.price_yearly / 12);
    return {
      total: plan.price_yearly.toLocaleString('es-MX'),
      monthly: monthlyEquivalent.toLocaleString('es-MX')
    };
  };

  const getPlanSavings = () => {
    if (plan.price_yearly === 0 || plan.custom_price) return null;
    const monthlyCost = plan.price_monthly * 12;
    const savings = ((monthlyCost - plan.price_yearly) / monthlyCost) * 100;
    return savings > 0 ? Math.round(savings) : null;
  };

  const yearlyDisplay = getYearlyPriceDisplay();
  const savingsPercent = getPlanSavings();

  return (
    <Card
      className={`relative ${
        plan.is_popular ? 'border-primary shadow-lg' : ''
      }`}
    >
      {plan.is_popular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
          Más Popular
        </Badge>
      )}

      <CardHeader>
        <CardTitle className="text-2xl">{plan.display_name}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>
        <div className="mt-4">
          {!isYearly ? (
            <>
              <div className="text-sm text-muted-foreground mb-1">Mensual:</div>
              <div className="text-4xl font-bold text-foreground">
                {getPlanPrice()}
              </div>
            </>
          ) : (
            <>
              {yearlyDisplay && (
                <>
                  <div className="text-sm text-muted-foreground mb-1">
                    Pago adelantado para ahorrar:
                  </div>
                  <div className="text-3xl font-bold text-foreground">
                    ${yearlyDisplay.total}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    (equivale a ${yearlyDisplay.monthly}/mes)
                  </div>
                  {savingsPercent && (
                    <Badge variant="secondary" className="mt-2">
                      Ahorras {savingsPercent}%
                    </Badge>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <ul className="space-y-3">
          {plan.features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          variant={plan.is_popular ? 'default' : 'outline'}
          onClick={() => onSelect(plan)}
          disabled={isProcessing || !isAuthenticated}
        >
          {!isAuthenticated ? 'Iniciar sesión' : plan.custom_price ? 'Contactar para cotización' : 'Seleccionar plan'}
        </Button>
      </CardFooter>
    </Card>
  );
};
