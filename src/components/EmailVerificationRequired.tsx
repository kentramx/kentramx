import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export const EmailVerificationRequired = () => {
  const { user, resendConfirmationEmail } = useAuth();
  const { toast } = useToast();
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    if (!user?.email) return;

    setResending(true);
    const { error } = await resendConfirmationEmail(user.email);
    
    if (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar el email de verificación",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Email enviado",
        description: "Revisa tu bandeja de entrada para verificar tu email",
      });
    }
    setResending(false);
  };

  return (
    <Alert variant="destructive" className="border-yellow-500 bg-yellow-50">
      <AlertTriangle className="h-5 w-5 text-yellow-600" />
      <AlertTitle className="text-yellow-900">
        Verifica tu email para publicar propiedades
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p className="text-sm text-yellow-800">
          Para garantizar la seguridad de nuestra plataforma, debes verificar tu dirección de email antes de publicar propiedades.
          Revisa tu bandeja de entrada y haz clic en el enlace de verificación.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="outline" className="text-yellow-800 border-yellow-300">
            {user?.email}
          </Badge>
          <Button 
            onClick={handleResend} 
            disabled={resending}
            size="sm"
            variant="outline"
            className="border-yellow-400 text-yellow-900 hover:bg-yellow-100"
          >
            {resending ? "Enviando..." : "Reenviar Email de Verificación"}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
