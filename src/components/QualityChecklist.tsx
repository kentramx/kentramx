import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle } from 'lucide-react';

const QUALITY_CHECKS = [
  { id: 'images', label: 'Mínimo 3 imágenes de calidad', required: true },
  { id: 'description', label: 'Descripción detallada (>50 palabras)', required: true },
  { id: 'amenities', label: 'Amenidades listadas', required: false },
  { id: 'price', label: 'Precio dentro de rango de mercado', required: true },
  { id: 'location', label: 'Ubicación verificada en mapa', required: true },
];

interface QualityChecklistProps {
  property: any;
}

const QualityChecklist = ({ property }: QualityChecklistProps) => {
  const checks = {
    images: property.images?.length >= 3,
    description: property.description?.split(' ').filter(Boolean).length >= 50,
    amenities: property.amenities?.length > 0,
    price: true, // TODO: validar contra precios promedio
    location: !!property.lat && !!property.lng,
  };

  const passedCount = Object.values(checks).filter(Boolean).length;
  const totalCount = QUALITY_CHECKS.length;
  const allRequiredPassed = QUALITY_CHECKS.filter(c => c.required).every(c => checks[c.id as keyof typeof checks]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Checklist de Calidad</span>
          <span className={`text-lg ${allRequiredPassed ? 'text-green-600' : 'text-red-600'}`}>
            {passedCount}/{totalCount}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {QUALITY_CHECKS.map((check) => (
          <div key={check.id} className="flex items-center gap-2">
            {checks[check.id as keyof typeof checks] ? (
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
            )}
            <span className={checks[check.id as keyof typeof checks] ? '' : 'text-muted-foreground'}>
              {check.label}
              {check.required && <span className="text-red-600 ml-1">*</span>}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default QualityChecklist;