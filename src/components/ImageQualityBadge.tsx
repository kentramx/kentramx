import { Badge } from '@/components/ui/badge';
import { Camera, AlertTriangle, Shield, Image as ImageIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ImageQualityBadgeProps {
  averageQuality?: number;
  analyzedCount?: number;
  hasInappropriate?: boolean;
  hasManipulated?: boolean;
  compact?: boolean;
}

const ImageQualityBadge = ({ 
  averageQuality, 
  analyzedCount = 0,
  hasInappropriate = false,
  hasManipulated = false,
  compact = false 
}: ImageQualityBadgeProps) => {
  if (analyzedCount === 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" className="gap-1">
              <ImageIcon className="h-3 w-3" />
              {!compact && <span>Sin análisis</span>}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Las imágenes no han sido analizadas por IA</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Prioridad: primero detectar problemas graves
  if (hasInappropriate) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {!compact && <span>⚠️ Contenido Inapropiado</span>}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="font-semibold text-destructive">Contenido Inapropiado Detectado</p>
            <p className="text-sm mt-1">
              Al menos una imagen contiene contenido que viola las políticas de la plataforma.
              Requiere revisión inmediata.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (hasManipulated) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="destructive" className="gap-1 bg-orange-500 hover:bg-orange-600">
              <Shield className="h-3 w-3" />
              {!compact && <span>Manipuladas</span>}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="font-semibold text-orange-600">Imágenes Manipuladas</p>
            <p className="text-sm mt-1">
              Se detectaron imágenes con edición digital engañosa que distorsiona la realidad
              de la propiedad. Esto puede afectar la confianza de los compradores.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Si no hay problemas graves, mostrar calidad
  const getQualityConfig = () => {
    const quality = averageQuality || 0;
    
    if (quality >= 80) {
      return {
        variant: 'default' as const,
        icon: Camera,
        label: 'Excelente',
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800',
      };
    } else if (quality >= 60) {
      return {
        variant: 'secondary' as const,
        icon: Camera,
        label: 'Buena',
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',
      };
    } else if (quality >= 40) {
      return {
        variant: 'secondary' as const,
        icon: Camera,
        label: 'Regular',
        color: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800',
      };
    } else {
      return {
        variant: 'destructive' as const,
        icon: AlertTriangle,
        label: 'Baja',
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800',
      };
    }
  };

  const config = getQualityConfig();
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge 
            variant={config.variant}
            className={`gap-1 ${config.bgColor}`}
          >
            <Icon className={`h-3 w-3 ${config.color}`} />
            {!compact && (
              <>
                <span>Calidad: {config.label}</span>
                <span className="font-semibold">({Math.round(averageQuality || 0)})</span>
              </>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <Camera className="h-4 w-4" />
              <span>Análisis de Calidad de Imágenes</span>
            </div>
            <div>
              <span className="font-medium">Score Promedio: </span>
              <span className={config.color}>{Math.round(averageQuality || 0)}/100</span>
            </div>
            <div>
              <span className="font-medium">Imágenes Analizadas: </span>
              <span>{analyzedCount}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {(averageQuality || 0) >= 80 && (
                <p>✨ Excelentes fotos profesionales. Alta probabilidad de conversión.</p>
              )}
              {(averageQuality || 0) >= 60 && (averageQuality || 0) < 80 && (
                <p>👍 Buena calidad general. Considera mejorar iluminación y composición.</p>
              )}
              {(averageQuality || 0) >= 40 && (averageQuality || 0) < 60 && (
                <p>⚠️ Calidad regular. Se recomienda tomar nuevas fotos más profesionales.</p>
              )}
              {(averageQuality || 0) < 40 && (
                <p>❌ Calidad muy baja. Es necesario reemplazar con fotos de mejor calidad.</p>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ImageQualityBadge;
