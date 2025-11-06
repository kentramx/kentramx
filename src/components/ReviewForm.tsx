import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

const reviewSchema = z.object({
  rating: z.number().min(1, "Debes seleccionar una calificación").max(5),
  comment: z.string().max(500, "El comentario no puede exceder 500 caracteres").optional(),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

interface ReviewFormProps {
  agentId: string;
  propertyId?: string;
  onReviewSubmitted?: () => void;
}

export const ReviewForm = ({ agentId, propertyId, onReviewSubmitted }: ReviewFormProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      comment: "",
    },
  });

  const onSubmit = async (data: ReviewFormData) => {
    if (!user) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para dejar una reseña",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("agent_reviews").insert({
        agent_id: agentId,
        buyer_id: user.id,
        property_id: propertyId || null,
        rating: data.rating,
        comment: data.comment || null,
      });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Error",
            description: "Ya has dejado una reseña para este agente y propiedad",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "¡Reseña publicada!",
        description: "Tu reseña ha sido publicada exitosamente",
      });

      form.reset();
      setOpen(false);
      onReviewSubmitted?.();
    } catch (error) {
      console.error("Error submitting review:", error);
      toast({
        title: "Error",
        description: "No se pudo publicar tu reseña. Intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => {
      const starValue = i + 1;
      const isActive = starValue <= (hoveredRating || rating);
      
      return (
        <button
          key={i}
          type="button"
          onClick={() => form.setValue("rating", starValue)}
          onMouseEnter={() => setHoveredRating(starValue)}
          onMouseLeave={() => setHoveredRating(0)}
          className="focus:outline-none transition-transform hover:scale-110"
        >
          <Star
            className={`w-8 h-8 ${
              isActive ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        </button>
      );
    });
  };

  if (!user) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Dejar Reseña</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Calificar Agente</DialogTitle>
          <DialogDescription>
            Comparte tu experiencia trabajando con este agente
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Calificación</FormLabel>
                  <FormControl>
                    <div className="flex gap-1">{renderStars(field.value)}</div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comentario (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Cuéntanos sobre tu experiencia..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">
              Publicar Reseña
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}