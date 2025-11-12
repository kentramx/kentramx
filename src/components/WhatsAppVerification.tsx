import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { MessageCircle, CheckCircle2, AlertTriangle, Loader2, Info } from "lucide-react";
import { formatPhoneDisplay } from "@/utils/whatsapp";
import { detectCountryFromNumber } from "@/data/countryCodes";

interface WhatsAppVerificationProps {
  whatsappNumber: string | null;
  whatsappVerified: boolean;
  whatsappVerifiedAt?: string | null;
  onVerificationComplete: () => void;
}

export const WhatsAppVerification = ({
  whatsappNumber,
  whatsappVerified,
  whatsappVerifiedAt,
  onVerificationComplete,
}: WhatsAppVerificationProps) => {
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    if (!whatsappNumber) {
      toast.error("Configura tu número de WhatsApp primero");
      return;
    }

    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-whatsapp-number');

      if (error) {
        console.error('Error verifying WhatsApp:', error);
        toast.error("Error al verificar WhatsApp");
        return;
      }

      if (data.hasWhatsApp) {
        toast.success("¡WhatsApp verificado exitosamente!", {
          description: "Tu número tiene WhatsApp activo",
        });
      } else {
        toast.error("WhatsApp no disponible", {
          description: "Este número no tiene WhatsApp activo. Verifica el número o instala WhatsApp.",
        });
      }

      onVerificationComplete();
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error("Error al verificar WhatsApp");
    } finally {
      setVerifying(false);
    }
  };

  // Sin número configurado
  if (!whatsappNumber) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="h-5 w-5 text-muted-foreground" />
            Verificación de WhatsApp
          </CardTitle>
          <CardDescription>
            Configura tu número de WhatsApp arriba para verificarlo
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const countryCode = detectCountryFromNumber(whatsappNumber);
  const formattedNumber = formatPhoneDisplay(whatsappNumber, countryCode);

  // WhatsApp verificado
  if (whatsappVerified) {
    const verifiedDate = whatsappVerifiedAt 
      ? new Date(whatsappVerifiedAt).toLocaleDateString('es-MX', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : 'Fecha desconocida';

    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-green-700">
            <CheckCircle2 className="h-5 w-5" />
            WhatsApp Verificado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
              <MessageCircle className="mr-1 h-3 w-3" />
              Verificado
            </Badge>
            <span className="text-sm text-muted-foreground">
              {formattedNumber}
            </span>
          </div>
          <p className="text-sm text-green-700">
            Tu número tiene WhatsApp activo. Los usuarios podrán contactarte directamente desde tus propiedades.
          </p>
          <p className="text-xs text-muted-foreground">
            Verificado el {verifiedDate}
          </p>
          
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Si cambias tu número, necesitarás verificarlo nuevamente
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // WhatsApp no verificado (estado por defecto)
  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-orange-700">
          <AlertTriangle className="h-5 w-5" />
          WhatsApp No Verificado
        </CardTitle>
        <CardDescription>
          Verifica que tu número tiene WhatsApp activo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Número a verificar:
          </p>
          <Badge variant="outline" className="text-sm">
            <MessageCircle className="mr-1 h-3 w-3" />
            {formattedNumber}
          </Badge>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            La verificación confirma que este número tiene WhatsApp activo usando Twilio Lookup API.
            No se enviará ningún mensaje.
          </AlertDescription>
        </Alert>

        <Button 
          onClick={handleVerify} 
          disabled={verifying}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {verifying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verificando WhatsApp...
            </>
          ) : (
            <>
              <MessageCircle className="mr-2 h-4 w-4" />
              Verificar WhatsApp
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          La verificación toma solo unos segundos
        </p>
      </CardContent>
    </Card>
  );
};