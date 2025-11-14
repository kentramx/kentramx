import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';

const Publicar = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Si no está autenticado, redirigir a login con redirect
    if (!loading && !user) {
      navigate('/auth?redirect=/publicar');
    }
  }, [user, loading, navigate]);

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

  if (loading) {
    return null;
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
