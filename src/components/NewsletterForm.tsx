import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Mail, Bell } from "lucide-react";

const newsletterSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "Correo electrónico inválido" })
    .max(255, { message: "El correo es demasiado largo" }),
  name: z
    .string()
    .trim()
    .max(100, { message: "El nombre es demasiado largo" })
    .optional(),
  listingType: z.enum(["venta", "renta", "ambos"]),
  propertyType: z.string().optional(),
  state: z.string().optional(),
  priceMin: z.string().optional(),
  priceMax: z.string().optional(),
});

type NewsletterFormData = z.infer<typeof newsletterSchema>;

export const NewsletterForm = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<NewsletterFormData>({
    resolver: zodResolver(newsletterSchema),
    defaultValues: {
      email: user?.email || "",
      listingType: "ambos",
    },
  });

  const listingType = watch("listingType");

  const onSubmit = async (data: NewsletterFormData) => {
    setIsSubmitting(true);

    try {
      const preferences = {
        listingType: data.listingType,
        propertyType: data.propertyType || null,
        state: data.state || null,
        priceMin: data.priceMin ? Number(data.priceMin) : null,
        priceMax: data.priceMax ? Number(data.priceMax) : null,
      };

      // Check if subscription already exists
      const { data: existing } = await supabase
        .from("newsletter_subscriptions")
        .select("id")
        .eq("email", data.email)
        .single();

      if (existing) {
        // Update existing subscription
        const { error } = await supabase
          .from("newsletter_subscriptions")
          .update({
            name: data.name || null,
            preferences,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq("email", data.email);

        if (error) throw error;

        toast({
          title: "¡Suscripción actualizada!",
          description: "Tus preferencias han sido actualizadas correctamente.",
        });
      } else {
        // Create new subscription
        const { error } = await supabase
          .from("newsletter_subscriptions")
          .insert({
            user_id: user?.id || null,
            email: data.email,
            name: data.name || null,
            preferences,
            is_active: true,
          });

        if (error) throw error;

        toast({
          title: "¡Suscripción exitosa!",
          description:
            "Te notificaremos cuando haya propiedades que coincidan con tus preferencias.",
        });
      }

      reset();
      setIsOpen(false);
    } catch (error: any) {
      console.error("Error subscribing to newsletter:", error);
      toast({
        title: "Error",
        description: "No se pudo completar la suscripción. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="gap-2">
          <Bell className="h-5 w-5" />
          Recibe Alertas de Propiedades
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Mail className="h-6 w-6 text-primary" />
            Suscríbete al Newsletter
          </DialogTitle>
          <DialogDescription>
            Recibe notificaciones cuando haya nuevas propiedades que coincidan con tus
            preferencias
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">
              Correo Electrónico <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              {...register("email")}
              disabled={!!user?.email}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre (opcional)</Label>
            <Input
              id="name"
              type="text"
              placeholder="Tu nombre"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Preferences Section */}
          <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-4">
            <h3 className="font-semibold text-lg">Preferencias de Búsqueda</h3>

            {/* Listing Type */}
            <div className="space-y-2">
              <Label htmlFor="listingType">
                Tipo de Operación <span className="text-destructive">*</span>
              </Label>
              <Select
                value={listingType}
                onValueChange={(value) =>
                  setValue("listingType", value as "venta" | "renta" | "ambos")
                }
              >
                <SelectTrigger id="listingType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ambos">Venta y Renta</SelectItem>
                  <SelectItem value="venta">Solo Venta</SelectItem>
                  <SelectItem value="renta">Solo Renta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Property Type */}
            <div className="space-y-2">
              <Label htmlFor="propertyType">Tipo de Propiedad (opcional)</Label>
              <Select
                onValueChange={(value) =>
                  setValue("propertyType", value === "all" ? undefined : value)
                }
              >
                <SelectTrigger id="propertyType">
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="casa">Casa</SelectItem>
                  <SelectItem value="departamento">Departamento</SelectItem>
                  <SelectItem value="terreno">Terreno</SelectItem>
                  <SelectItem value="oficina">Oficina</SelectItem>
                  <SelectItem value="local">Local Comercial</SelectItem>
                  <SelectItem value="bodega">Bodega</SelectItem>
                  <SelectItem value="edificio">Edificio</SelectItem>
                  <SelectItem value="rancho">Rancho</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* State */}
            <div className="space-y-2">
              <Label htmlFor="state">Estado (opcional)</Label>
              <Input
                id="state"
                type="text"
                placeholder="Ej: Jalisco"
                {...register("state")}
              />
            </div>

            {/* Price Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priceMin">Precio Mínimo (opcional)</Label>
                <Input
                  id="priceMin"
                  type="number"
                  placeholder="$0"
                  {...register("priceMin")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priceMax">Precio Máximo (opcional)</Label>
                <Input
                  id="priceMax"
                  type="number"
                  placeholder="Sin límite"
                  {...register("priceMax")}
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Suscribiendo..." : "Suscribirse"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
