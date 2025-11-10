import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { DynamicBreadcrumbs } from '@/components/DynamicBreadcrumbs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase, Building2, Building } from 'lucide-react';

const PricingSelector = () => {
  const navigate = useNavigate();

  const userTypes = [
    {
      id: 'agent',
      icon: Briefcase,
      title: 'Agente Inmobiliario',
      description: 'Herramientas profesionales para tu carrera',
      priceRange: 'Desde $299/mes',
      path: '/pricing/agentes',
      features: ['Hasta 20 propiedades', 'Autopublicación en redes', 'Analytics avanzados']
    },
    {
      id: 'agency',
      icon: Building2,
      title: 'Inmobiliaria',
      description: 'Gestión completa para equipos',
      priceRange: 'Desde $5,900/mes',
      path: '/pricing/inmobiliarias',
      features: ['Equipos de hasta 20 agentes', 'Pool compartido', 'Dashboard colaborativo']
    },
    {
      id: 'developer',
      icon: Building,
      title: 'Desarrolladora',
      description: 'Proyectos de gran escala',
      priceRange: 'Desde $18,000/mes',
      path: '/pricing/desarrolladoras',
      features: ['600+ propiedades', 'Landing personalizado', 'Gestor dedicado']
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <DynamicBreadcrumbs
          items={[
            { label: 'Inicio', href: '/', active: false },
            { label: 'Planes y Precios', href: '', active: true },
          ]}
          className="mb-4"
        />

        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              ¿Qué tipo de usuario eres?
            </h1>
            <p className="text-xl text-muted-foreground">
              Selecciona la opción que mejor se ajuste a ti
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {userTypes.map((type) => {
              const Icon = type.icon;
              return (
                <Card
                  key={type.id}
                  className="hover:shadow-xl transition-all cursor-pointer group hover:border-primary"
                  onClick={() => navigate(type.path)}
                >
                  <CardHeader className="text-center">
                    <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">{type.title}</CardTitle>
                    <CardDescription className="text-base">{type.description}</CardDescription>
                    <div className="pt-4">
                      <div className="text-xl font-bold text-primary">{type.priceRange}</div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 mb-6">
                      {type.features.map((feature, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground">
                          • {feature}
                        </li>
                      ))}
                    </ul>
                    <Button className="w-full" variant="outline">
                      Ver Planes
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PricingSelector;
