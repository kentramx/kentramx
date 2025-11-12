import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, XCircle, Image as ImageIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ImageAnalysisPreviewProps {
  summary: {
    totalImages: number;
    averageQuality: number;
    hasIssues: boolean;
    inappropriateCount: number;
    manipulatedCount: number;
    lowQualityCount: number;
  };
  results: Array<{
    imageId: string;
    qualityScore: number;
    isInappropriate: boolean;
    isManipulated: boolean;
    isBlurry: boolean;
    isDark: boolean;
    detectedIssues: string[];
    aiNotes: string;
  }>;
}

export const ImageAnalysisPreview = ({ summary, results }: ImageAnalysisPreviewProps) => {
  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityIcon = (score: number) => {
    if (score >= 80) return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    if (score >= 60) return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    return <XCircle className="h-5 w-5 text-red-600" />;
  };

  return (
    <Card className="border-purple-200 bg-purple-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-purple-600" />
          Análisis de Calidad de Imágenes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumen general */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getQualityIcon(summary.averageQuality)}
            <div>
              <p className="font-semibold">Calidad Promedio</p>
              <p className={`text-2xl font-bold ${getQualityColor(summary.averageQuality)}`}>
                {summary.averageQuality}/100
              </p>
            </div>
          </div>
          <Badge variant={summary.hasIssues ? 'destructive' : 'default'}>
            {summary.totalImages} imagen{summary.totalImages === 1 ? '' : 'es'} analizada{summary.totalImages === 1 ? '' : 's'}
          </Badge>
        </div>

        {/* Problemas detectados */}
        {summary.hasIssues && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Problemas detectados</AlertTitle>
            <AlertDescription className="space-y-1">
              {summary.inappropriateCount > 0 && (
                <p>• {summary.inappropriateCount} imagen{summary.inappropriateCount === 1 ? '' : 'es'} con contenido inapropiado</p>
              )}
              {summary.manipulatedCount > 0 && (
                <p>• {summary.manipulatedCount} imagen{summary.manipulatedCount === 1 ? '' : 'es'} manipulada{summary.manipulatedCount === 1 ? '' : 's'}</p>
              )}
              {summary.lowQualityCount > 0 && (
                <p>• {summary.lowQualityCount} imagen{summary.lowQualityCount === 1 ? '' : 'es'} de baja calidad</p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Detalles por imagen */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Análisis individual:</p>
          {results.map((result, index) => (
            <div key={result.imageId} className="flex items-start gap-3 p-3 bg-background rounded-lg border">
              <div className="flex-shrink-0">
                {getQualityIcon(result.qualityScore)}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">Imagen {index + 1}</p>
                  <span className={`text-sm font-semibold ${getQualityColor(result.qualityScore)}`}>
                    {result.qualityScore}/100
                  </span>
                </div>
                <Progress value={result.qualityScore} className="h-2" />
                {result.detectedIssues.length > 0 && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    {result.detectedIssues.map((issue, i) => (
                      <p key={i}>• {issue}</p>
                    ))}
                  </div>
                )}
                {result.aiNotes && (
                  <p className="text-xs italic text-muted-foreground">{result.aiNotes}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Mensaje de éxito */}
        {!summary.hasIssues && summary.averageQuality >= 80 && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">¡Excelente calidad!</AlertTitle>
            <AlertDescription className="text-green-700">
              Tus imágenes cumplen con los estándares de calidad más altos. Esto aumentará la visibilidad y atractivo de tu propiedad.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
