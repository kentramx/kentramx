import { Home, Star, CheckCircle, Calendar } from 'lucide-react';
import { differenceInDays } from 'date-fns';

interface PlanMetricsCardsProps {
  subscriptionInfo: any;
  activePropertiesCount: number;
  featuredCount: number;
}

export const PlanMetricsCards = ({
  subscriptionInfo,
  activePropertiesCount,
  featuredCount,
}: PlanMetricsCardsProps) => {
  // Calcular días hasta renovación
  const daysUntilRenewal = subscriptionInfo?.current_period_end
    ? differenceInDays(new Date(subscriptionInfo.current_period_end), new Date())
    : null;

  // Obtener límites del plan
  const propertiesLimit = subscriptionInfo?.properties_limit || 1;
  const featuredLimit = subscriptionInfo?.featured_limit || 0;
  const isUnlimited = propertiesLimit === -1;

  const metrics = [
    {
      icon: Home,
      label: 'Propiedades disponibles',
      value: isUnlimited
        ? 'Sin límite'
        : `${activePropertiesCount} de ${propertiesLimit} usadas`,
      bgColor: 'bg-slate-50 dark:bg-slate-900/20',
      iconBg: 'bg-slate-200 dark:bg-slate-800',
      iconColor: 'text-slate-700 dark:text-slate-300',
    },
    {
      icon: Star,
      label: 'Destacadas disponibles',
      value: featuredLimit === -1
        ? 'Sin límite'
        : `${featuredCount} de ${featuredLimit} usadas`,
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      iconBg: 'bg-purple-200 dark:bg-purple-800',
      iconColor: 'text-purple-700 dark:text-purple-300',
    },
    {
      icon: CheckCircle,
      label: 'Activas actualmente',
      value: `${activePropertiesCount} propiedades`,
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      iconBg: 'bg-green-200 dark:bg-green-800',
      iconColor: 'text-green-700 dark:text-green-300',
    },
    {
      icon: Calendar,
      label: 'Próxima renovación',
      value: daysUntilRenewal !== null
        ? daysUntilRenewal > 0
          ? `${daysUntilRenewal} días`
          : 'Vencido'
        : 'No aplica',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      iconBg: 'bg-orange-200 dark:bg-orange-800',
      iconColor: 'text-orange-700 dark:text-orange-300',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {metrics.map((metric, index) => (
        <div
          key={index}
          className={`${metric.bgColor} rounded-xl p-6 transition-all hover:shadow-md`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-2">{metric.label}</p>
              <p className="text-2xl font-bold text-foreground">{metric.value}</p>
            </div>
            <div className={`${metric.iconBg} rounded-full p-3`}>
              <metric.icon className={`h-6 w-6 ${metric.iconColor}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
