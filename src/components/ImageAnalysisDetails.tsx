import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, AlertTriangle, CheckCircle2, XCircle, Zap } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ImageAnalysisDetailsProps {
  propertyId: string;
}

const ImageAnalysisDetails = ({ propertyId }: ImageAnalysisDetailsProps) => {
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyses();
  }, [propertyId]);

  const fetchAnalyses = async () => {
    try {
      const { data, error } = await supabase
        .from('image_ai_analysis')
        .select(`
          *,
          images (url, position)
        `)
        .eq('property_id', propertyId)
        .order('images(position)', { ascending: true });

      if (error) throw error;
      setAnalyses(data || []);
    } catch (error) {
      console.error('Error fetching image analyses:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (analyses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Análisis de Imágenes con IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Las imágenes de esta propiedad no han sido analizadas por IA
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const averageQuality = analyses.reduce((sum, a) => sum + (a.quality_score || 0), 0) / analyses.length;
  const hasIssues = analyses.some(a => a.is_inappropriate || a.is_manipulated || a.quality_score < 60);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Análisis de Imágenes con IA
            </CardTitle>
            <CardDescription>
              {analyses.length} imágenes analizadas - Calidad promedio: {Math.round(averageQuality)}/100
            </CardDescription>
          </div>
          {hasIssues && (
            <Badge variant="destructive">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Problemas Detectados
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Resumen general */}
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Calidad</p>
            <Progress value={averageQuality} className="h-2" />
            <p className="text-xs font-semibold">{Math.round(averageQuality)}/100</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Inapropiadas</p>
            <div className="text-2xl font-bold text-red-600">
              {analyses.filter(a => a.is_inappropriate).length}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Manipuladas</p>
            <div className="text-2xl font-bold text-orange-600">
              {analyses.filter(a => a.is_manipulated).length}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Baja Calidad</p>
            <div className="text-2xl font-bold text-yellow-600">
              {analyses.filter(a => a.quality_score < 60).length}
            </div>
          </div>
        </div>

        {/* Detalle por imagen */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Análisis Detallado por Imagen</h4>
          {analyses.map((analysis, index) => (
            <Card key={analysis.id} className="border">
              <CardContent className="pt-4">
                <div className="flex gap-4">
                  {analysis.images?.url && (
                    <img 
                      src={analysis.images.url} 
                      alt={`Imagen ${index + 1}`}
                      className="h-24 w-24 rounded object-cover"
                    />
                  )}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">Imagen #{index + 1}</span>
                      <div className="flex gap-2">
                        {analysis.is_inappropriate && (
                          <Badge variant="destructive" className="text-xs">
                            <XCircle className="h-3 w-3 mr-1" />
                            Inapropiada
                          </Badge>
                        )}
                        {analysis.is_manipulated && (
                          <Badge variant="destructive" className="bg-orange-500 text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Manipulada
                          </Badge>
                        )}
                        {analysis.is_blurry && (
                          <Badge variant="secondary" className="text-xs">
                            Borrosa
                          </Badge>
                        )}
                        {analysis.is_dark && (
                          <Badge variant="secondary" className="text-xs">
                            Oscura
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Scores */}
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Calidad</p>
                        <div className="flex items-center gap-1">
                          <Progress value={analysis.quality_score} className="h-1.5" />
                          <span className="text-xs font-semibold w-8">{Math.round(analysis.quality_score)}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Resolución</p>
                        <div className="flex items-center gap-1">
                          <Progress value={analysis.resolution_score} className="h-1.5" />
                          <span className="text-xs font-semibold w-8">{Math.round(analysis.resolution_score)}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Iluminación</p>
                        <div className="flex items-center gap-1">
                          <Progress value={analysis.lighting_score} className="h-1.5" />
                          <span className="text-xs font-semibold w-8">{Math.round(analysis.lighting_score)}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Composición</p>
                        <div className="flex items-center gap-1">
                          <Progress value={analysis.composition_score} className="h-1.5" />
                          <span className="text-xs font-semibold w-8">{Math.round(analysis.composition_score)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Notas de IA */}
                    {analysis.ai_notes && (
                      <p className="text-xs text-muted-foreground italic">
                        {analysis.ai_notes}
                      </p>
                    )}

                    {/* Problemas detectados */}
                    {analysis.detected_issues && analysis.detected_issues.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {analysis.detected_issues.map((issue: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {issue}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recomendación final */}
        {averageQuality >= 80 && !hasIssues && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Imágenes de excelente calidad.</strong> Cumplen con todos los estándares de la plataforma.
            </AlertDescription>
          </Alert>
        )}

        {hasIssues && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Se detectaron problemas en las imágenes.</strong> Revisa cuidadosamente antes de aprobar.
            </AlertDescription>
          </Alert>
        )}

      </CardContent>
    </Card>
  );
};

export default ImageAnalysisDetails;
