import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Home, TrendingUp, Users } from 'lucide-react';

interface EmptyStatePublishProps {
  onCreateProperty: () => void;
  role?: 'agent' | 'agency';
}

export const EmptyStatePublish = ({ onCreateProperty, role = 'agent' }: EmptyStatePublishProps) => {
  const benefits = role === 'agent' 
    ? [
        { icon: Home, text: 'Alcanza miles de compradores interesados' },
        { icon: TrendingUp, text: 'Aumenta tus oportunidades de venta' },
        { icon: Users, text: 'Genera leads calificados automáticamente' },
      ]
    : [
        { icon: Home, text: 'Gestiona el inventario de tu equipo' },
        { icon: TrendingUp, text: 'Asigna propiedades a tus agentes' },
        { icon: Users, text: 'Controla todo desde un solo lugar' },
      ];

  return (
    <Card className="border-dashed">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Home className="h-10 w-10 text-primary" />
        </div>
        <CardTitle className="text-2xl">¡Bienvenido a Kentra!</CardTitle>
        <CardDescription className="text-base">
          {role === 'agent' 
            ? 'Comienza publicando tu primera propiedad y alcanza a miles de compradores potenciales.'
            : 'Comienza publicando propiedades de tu inventario y gestiona todo desde un solo lugar.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Benefits */}
        <div className="space-y-3">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <benefit.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm">{benefit.text}</span>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <Button 
          size="lg" 
          onClick={onCreateProperty}
          className="w-full gap-2"
        >
          <Plus className="h-5 w-5" />
          Publicar mi primera propiedad
        </Button>

        {/* Help Text */}
        <p className="text-xs text-center text-muted-foreground">
          Es rápido y fácil. Solo toma unos minutos completar la información básica.
        </p>
      </CardContent>
    </Card>
  );
};
