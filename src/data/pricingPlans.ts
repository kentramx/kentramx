export interface Plan {
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

export const PLANS: Plan[] = [
  // PLANES PARA AGENTES
  {
    id: 'agent-basic',
    name: 'basic',
    display_name: 'Agente Básico',
    description: 'Ideal para iniciar tu carrera',
    price_monthly: 299,
    price_yearly: 3150,
    category: 'agent',
    features: [
      'Hasta 4 propiedades activas',
      'Renovación sin caducar',
      'Página básica',
      'Leads directo a WhatsApp',
      '1 propiedad destacada al mes'
    ],
  },
  {
    id: 'agent-pro',
    name: 'pro',
    display_name: 'Agente Pro',
    description: 'Para agentes profesionales',
    price_monthly: 799,
    price_yearly: 8430,
    category: 'agent',
    is_popular: true,
    features: [
      'Hasta 10 propiedades activas',
      'Página profesional',
      'Autopublicación Facebook e Instagram',
      'Leads directo a WhatsApp',
      '3 propiedades destacadas al mes'
    ],
  },
  {
    id: 'agent-elite',
    name: 'elite',
    display_name: 'Agente Elite',
    description: 'Presencia premium en el mercado',
    price_monthly: 1350,
    price_yearly: 14256,
    category: 'agent',
    features: [
      'Hasta 20 propiedades activas',
      'Presencia premium + branding',
      'Autopublicación optimizada',
      '6 propiedades destacadas al mes',
      'Prioridad en visibilidad'
    ],
  },
  // PLANES PARA INMOBILIARIAS
  {
    id: 'agency-start',
    name: 'start',
    display_name: 'Inmobiliaria Start',
    description: 'Para equipos pequeños',
    price_monthly: 5900,
    price_yearly: 62352,
    category: 'agency',
    features: [
      'Hasta 5 agentes',
      '50 propiedades activas',
      'Inventario en pool compartido',
      'Sitio inmobiliaria',
      'Páginas por agente',
      'Ruteo de leads'
    ],
  },
  {
    id: 'agency-grow',
    name: 'grow',
    display_name: 'Inmobiliaria Grow',
    description: 'Para inmobiliarias en crecimiento',
    price_monthly: 9900,
    price_yearly: 104544,
    category: 'agency',
    is_popular: true,
    features: [
      'Hasta 10 agentes',
      '120 propiedades activas',
      'Inventario en pool compartido',
      'Métricas de equipo',
      'Prioridad de visibilidad',
      'Dashboard colaborativo'
    ],
  },
  {
    id: 'agency-pro',
    name: 'agency-pro',
    display_name: 'Inmobiliaria Pro',
    description: 'Solución empresarial completa',
    price_monthly: 15900,
    price_yearly: 167616,
    category: 'agency',
    features: [
      'Hasta 20 agentes',
      '250 propiedades activas',
      'Roles y permisos',
      'Visibilidad preferencial',
      'Acompañamiento dedicado',
      'Reportes personalizados'
    ],
  },
  // PLAN DESARROLLADORA
  {
    id: 'developer',
    name: 'developer',
    display_name: 'Desarrolladora',
    description: 'Proyectos de gran escala',
    price_monthly: 18000,
    price_yearly: 0,
    category: 'developer',
    custom_price: true,
    features: [
      '600+ propiedades por proyecto',
      'Landing por torre',
      'Campañas personalizadas',
      'Reporte semanal',
      'La pauta/publicidad la paga la desarrolladora',
      'Gestor de cuenta dedicado'
    ],
  },
];
