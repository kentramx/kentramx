import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { useUserRole } from '@/hooks/useUserRole';
import { Loader2 } from 'lucide-react';

const Publicar = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { userRole, loading: roleLoading } = useUserRole();

  useEffect(() => {
    if (authLoading || roleLoading) return;

    // Si no está autenticado, redirigir a login con redirect
    if (!user) {
      navigate('/auth?redirect=/publicar');
      return;
    }

    // Si ya tiene rol asignado, redirigir a su dashboard correspondiente
    if (userRole === 'agent') {
      navigate('/panel-agente');
      return;
    }

    if (userRole === 'agency') {
      navigate('/panel-inmobiliaria');
      return;
    }

    // Si es buyer, super_admin, o moderator, mostrar opciones de selección
  }, [user, userRole, authLoading, roleLoading, navigate]);

  const options = [
    {
      title: 'Soy Agente',
      description: 'Publico propiedades como agente independiente.',
      path: '/pricing-agente',
      role: 'agent',
    },
    {
      title: 'Soy Inmobiliaria',
      description: 'Trabajo con un equipo de agentes y un inventario compartido.',
      path: '/pricing-inmobiliaria',
      role: 'agency',
    },
    {
      title: 'Soy Desarrolladora',
      description: 'Promociono proyectos completos (torres, fraccionamientos).',
      path: '/pricing-desarrolladora',
      role: 'agency',
    },
  ];

  // Mostrar loader mientras se verifica autenticación y rol
  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <main className="flex items-center justify-center px-4 py-16 md:py-24">
        <div className="w-full max-w-3xl space-y-12">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              ¿Quién va a publicar?
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              Elige el tipo de cuenta que se adapta a tu actividad.
            </p>
          </div>

          <div className="space-y-6 md:px-16">
            {options.map((option) => (
              <Button
                key={option.path}
                onClick={() => navigate(option.path)}
                className="w-full h-auto py-6 px-8 rounded-2xl shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 bg-primary hover:bg-primary/90"
                variant="default"
              >
                <div className="flex flex-col items-start text-left w-full">
                  <span className="text-xl font-semibold text-primary-foreground">
                    {option.title}
                  </span>
                  <span className="text-sm font-normal text-primary-foreground/80 mt-1">
                    {option.description}
                  </span>
                </div>
              </Button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Publicar;
