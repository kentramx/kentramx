import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Star, Loader2 } from 'lucide-react';

interface Upsell {
  id: string;
  name: string;
  description: string;
  price: number;
  stripePriceId: string;
  icon: any;
  badge?: string;
  recurring?: boolean;
}

interface UpsellDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planName: string;
  planPrice: number;
  billingCycle: 'monthly' | 'yearly';
  onConfirm: (selectedUpsells: Upsell[]) => Promise<void>;
}

const UPSELLS: Upsell[] = [
  {
    id: 'property_slot',
    name: 'Slot Adicional de Propiedad',
    description: 'Agrega 1 propiedad activa adicional a tu plan',
    price: 49,
    stripePriceId: 'price_property_slot_monthly', // Usuario debe crear esto en Stripe
    icon: Plus,
    badge: 'Más Popular',
    recurring: true,
  },
  {
    id: 'featured_7days',
    name: 'Destacar Propiedad 7 Días',
    description: 'Destaca 1 propiedad por 7 días (pago único)',
    price: 59,
    stripePriceId: 'price_featured_7days', // Usuario debe crear esto en Stripe
    icon: Star,
    recurring: false,
  },
];

export const UpsellDialog = ({
  open,
  onOpenChange,
  planName,
  planPrice,
  billingCycle,
  onConfirm,
}: UpsellDialogProps) => {
  const [selectedUpsells, setSelectedUpsells] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleToggleUpsell = (upsellId: string) => {
    setSelectedUpsells((prev) =>
      prev.includes(upsellId)
        ? prev.filter((id) => id !== upsellId)
        : [...prev, upsellId]
    );
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const selected = UPSELLS.filter((u) => selectedUpsells.includes(u.id));
      await onConfirm(selected);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    const upsellsTotal = UPSELLS
      .filter((u) => selectedUpsells.includes(u.id))
      .reduce((sum, u) => sum + (u.recurring ? u.price : 0), 0);
    
    return planPrice + upsellsTotal;
  };

  const oneTimeTotal = UPSELLS
    .filter((u) => selectedUpsells.includes(u.id) && !u.recurring)
    .reduce((sum, u) => sum + u.price, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Mejora tu Experiencia</DialogTitle>
          <DialogDescription>
            Has seleccionado <strong>{planName}</strong>. Agrega extras para maximizar tu alcance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Plan Base */}
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">{planName}</h4>
                <p className="text-sm text-muted-foreground">
                  Plan {billingCycle === 'yearly' ? 'anual' : 'mensual'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">${planPrice.toLocaleString('es-MX')}</p>
                <p className="text-xs text-muted-foreground">
                  {billingCycle === 'yearly' ? '/año' : '/mes'}
                </p>
              </div>
            </div>
          </div>

          {/* Upsells */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Extras Disponibles:</h4>
            {UPSELLS.map((upsell) => {
              const Icon = upsell.icon;
              const isSelected = selectedUpsells.includes(upsell.id);
              
              return (
                <div
                  key={upsell.id}
                  className={`flex items-start space-x-3 rounded-lg border p-4 transition-colors cursor-pointer hover:bg-muted/50 ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onClick={() => handleToggleUpsell(upsell.id)}
                >
                  <Checkbox
                    id={upsell.id}
                    checked={isSelected}
                    onCheckedChange={() => handleToggleUpsell(upsell.id)}
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <Label
                        htmlFor={upsell.id}
                        className="font-medium cursor-pointer"
                      >
                        {upsell.name}
                      </Label>
                      {upsell.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {upsell.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {upsell.description}
                    </p>
                    <p className="text-sm font-semibold text-primary">
                      +${upsell.price} {upsell.recurring ? `/${billingCycle === 'yearly' ? 'año' : 'mes'}` : '(pago único)'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="space-y-2">
              {billingCycle === 'monthly' || selectedUpsells.some(id => UPSELLS.find(u => u.id === id)?.recurring) ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Recurrente:</span>
                  <span className="text-xl font-bold">
                    ${calculateTotal().toLocaleString('es-MX')}/{billingCycle === 'yearly' ? 'año' : 'mes'}
                  </span>
                </div>
              ) : null}
              {oneTimeTotal > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Cargos Únicos:</span>
                  <span className="text-lg font-semibold text-primary">
                    ${oneTimeTotal.toLocaleString('es-MX')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              'Continuar al Pago'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
