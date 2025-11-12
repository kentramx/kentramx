import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, User, MapPin, FileText, Shield, Phone, MessageCircle } from "lucide-react";

interface ProfileCompletenessProps {
  profile: {
    avatar_url?: string | null;
    bio?: string | null;
    city?: string | null;
    state?: string | null;
    is_verified?: boolean | null;
    phone_verified?: boolean | null;
    whatsapp_verified?: boolean | null;
  };
  emailVerified: boolean;
}

interface CompletenessItem {
  key: string;
  label: string;
  completed: boolean;
  weight: number;
  icon: React.ComponentType<{ className?: string }>;
  suggestion?: string;
}

export const ProfileCompleteness = ({ profile, emailVerified }: ProfileCompletenessProps) => {
  const items: CompletenessItem[] = [
    {
      key: "avatar",
      label: "Foto de perfil",
      completed: !!profile.avatar_url,
      weight: 15,
      icon: User,
      suggestion: "Sube una foto profesional para generar más confianza"
    },
    {
      key: "bio",
      label: "Biografía",
      completed: !!profile.bio && profile.bio.length > 20,
      weight: 15,
      icon: FileText,
      suggestion: "Describe tu experiencia y especialización (mínimo 20 caracteres)"
    },
    {
      key: "location",
      label: "Ubicación",
      completed: !!(profile.city && profile.state),
      weight: 10,
      icon: MapPin,
      suggestion: "Agrega tu ciudad y estado para que compradores te encuentren"
    },
    {
      key: "email",
      label: "Email verificado",
      completed: emailVerified,
      weight: 20,
      icon: Shield,
      suggestion: "Verifica tu email para publicar propiedades"
    },
    {
      key: "phone",
      label: "Teléfono verificado",
      completed: !!profile.phone_verified,
      weight: 15,
      icon: Phone,
      suggestion: "Verifica tu teléfono para mayor credibilidad"
    },
    {
      key: "whatsapp",
      label: "WhatsApp verificado",
      completed: !!profile.whatsapp_verified,
      weight: 15,
      icon: MessageCircle,
      suggestion: "Verifica tu WhatsApp para facilitar el contacto"
    },
    {
      key: "kyc",
      label: "Identidad verificada (KYC)",
      completed: !!profile.is_verified,
      weight: 10,
      icon: Shield,
      suggestion: "Verifica tu identidad con INE/RFC para destacar en el directorio"
    }
  ];

  const completedWeight = items.reduce((sum, item) => 
    sum + (item.completed ? item.weight : 0), 0
  );
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  const percentage = Math.round((completedWeight / totalWeight) * 100);

  const missingItems = items.filter(item => !item.completed);
  const completedItems = items.filter(item => item.completed);

  const getProgressColor = () => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getStatusBadge = () => {
    if (percentage === 100) return { variant: "default" as const, text: "Perfil Completo" };
    if (percentage >= 80) return { variant: "secondary" as const, text: "Casi Completo" };
    if (percentage >= 50) return { variant: "outline" as const, text: "En Progreso" };
    return { variant: "destructive" as const, text: "Incompleto" };
  };

  const statusBadge = getStatusBadge();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Completitud de Perfil</CardTitle>
          <Badge variant={statusBadge.variant}>{statusBadge.text}</Badge>
        </div>
        <CardDescription>
          Tu perfil está {percentage}% completo. Un perfil completo mejora tu visibilidad y credibilidad.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Progreso</span>
            <span className="font-bold text-lg">{percentage}%</span>
          </div>
          <Progress value={percentage} className="h-3" />
        </div>

        {completedItems.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Completado</h4>
            <div className="space-y-1">
              {completedItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.key} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {missingItems.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Campos Pendientes</h4>
            <div className="space-y-3">
              {missingItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.key} className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Circle className="h-4 w-4 text-muted-foreground" />
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.suggestion && (
                      <p className="text-xs text-muted-foreground ml-10">
                        {item.suggestion}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
