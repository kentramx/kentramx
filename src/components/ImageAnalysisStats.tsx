import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, AlertTriangle, Shield, TrendingUp, Image as ImageIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ImageStatsData {
  totalAnalyzed: number;
  averageQuality: number;
  inappropriateCount: number;
  manipulatedCount: number;
  lowQualityCount: number;
  excellentQualityCount: number;
}

const ImageAnalysisStats = () => {
  const [stats, setStats] = useState<ImageStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Obtener estadísticas de los últimos 30 días
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('image_ai_analysis')
        .select('quality_score, is_inappropriate, is_manipulated')
        .gte('created_at', thirtyDaysAgo);
      
      if (error) throw error;
      
      if (data) {
        const totalAnalyzed = data.length;
        const averageQuality = totalAnalyzed > 0 
          ? data.reduce((sum, img) => sum + (img.quality_score || 0), 0) / totalAnalyzed
          : 0;
        const inappropriateCount = data.filter(img => img.is_inappropriate).length;
        const manipulatedCount = data.filter(img => img.is_manipulated).length;
        const lowQualityCount = data.filter(img => (img.quality_score || 0) < 60).length;
        const excellentQualityCount = data.filter(img => (img.quality_score || 0) >= 80).length;

        setStats({
          totalAnalyzed,
          averageQuality,
          inappropriateCount,
          manipulatedCount,
          lowQualityCount,
          excellentQualityCount,
        });
      }
    } catch (error) {
      console.error('Error fetching image stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.totalAnalyzed === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Análisis de Imágenes con IA
          </CardTitle>
          <CardDescription>
            No hay imágenes analizadas en los últimos 30 días
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const inappropriateRate = Math.round((stats.inappropriateCount / stats.totalAnalyzed) * 100);
  const manipulatedRate = Math.round((stats.manipulatedCount / stats.totalAnalyzed) * 100);
  const excellentRate = Math.round((stats.excellentQualityCount / stats.totalAnalyzed) * 100);

  return (
    <Card className="border-purple-200/50 bg-gradient-to-br from-purple-50/50 to-transparent">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-purple-600" />
          <CardTitle>Análisis de Imágenes con IA</CardTitle>
        </div>
        <CardDescription>
          Estadísticas de análisis automático de imágenes en los últimos 30 días
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          
          {/* Total Analizadas */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ImageIcon className="h-4 w-4" />
              <span>Total Analizadas</span>
            </div>
            <div className="text-3xl font-bold text-purple-600">
              {stats.totalAnalyzed}
            </div>
          </div>

          {/* Calidad Promedio */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>Calidad Promedio</span>
            </div>
            <div className="text-3xl font-bold text-blue-600">
              {Math.round(stats.averageQuality)}
            </div>
            <Badge variant="secondary" className="text-xs">
              de 100
            </Badge>
          </div>

          {/* Excelente Calidad */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Camera className="h-4 w-4" />
              <span>Calidad Excelente</span>
            </div>
            <div className="text-3xl font-bold text-green-600">
              {stats.excellentQualityCount}
            </div>
            <Badge variant="secondary" className="text-xs">
              {excellentRate}% del total
            </Badge>
          </div>

          {/* Inapropiadas */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              <span>Inapropiadas</span>
            </div>
            <div className="text-3xl font-bold text-red-600">
              {stats.inappropriateCount}
            </div>
            {stats.inappropriateCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {inappropriateRate}% del total
              </Badge>
            )}
          </div>

          {/* Manipuladas */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Manipuladas</span>
            </div>
            <div className="text-3xl font-bold text-orange-600">
              {stats.manipulatedCount}
            </div>
            {stats.manipulatedCount > 0 && (
              <Badge variant="secondary" className="text-xs bg-orange-100">
                {manipulatedRate}% del total
              </Badge>
            )}
          </div>

        </div>

        {/* Alertas importantes */}
        {(stats.inappropriateCount > 0 || stats.manipulatedCount > 0) && (
          <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="text-sm space-y-1">
                <p className="font-semibold text-destructive">Contenido Problemático Detectado</p>
                {stats.inappropriateCount > 0 && (
                  <p className="text-muted-foreground">
                    • <strong>{stats.inappropriateCount}</strong> imágenes con contenido inapropiado detectadas
                  </p>
                )}
                {stats.manipulatedCount > 0 && (
                  <p className="text-muted-foreground">
                    • <strong>{stats.manipulatedCount}</strong> imágenes manipuladas de forma engañosa
                  </p>
                )}
                <p className="text-muted-foreground mt-2">
                  Estas propiedades requieren revisión prioritaria antes de aprobación.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Información del sistema */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-2">
          <div className="flex items-start gap-2">
            <Camera className="h-5 w-5 text-purple-600 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-semibold">Sistema de Análisis Visual con IA</p>
              <p className="text-muted-foreground">
                Cada imagen se analiza automáticamente para detectar:
              </p>
              <ul className="list-disc list-inside text-muted-foreground ml-2 space-y-0.5">
                <li>Calidad técnica (resolución, iluminación, composición)</li>
                <li>Contenido inapropiado o explícito</li>
                <li>Manipulación digital engañosa</li>
                <li>Problemas comunes (borrosidad, oscuridad)</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                <strong>Auto-aprobación:</strong> Requiere calidad promedio ≥70/100 sin problemas graves.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ImageAnalysisStats;
