import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationRequest {
  phoneNumber: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "No autorizado" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { phoneNumber }: VerificationRequest = await req.json();

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ error: "Número de teléfono requerido" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Generate 6-digit OTP code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    console.log("📱 Generating verification code for:", phoneNumber);

    // Save verification code to database
    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update({
        phone: phoneNumber,
        phone_verification_code: verificationCode,
        phone_verification_expires_at: expiresAt.toISOString(),
        phone_verified: false, // Reset verification status
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error saving verification code:", updateError);
      return new Response(
        JSON.stringify({ error: "Error al guardar código de verificación" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // TODO: Send SMS using Twilio
    // For now, we'll just log the code (DEVELOPMENT ONLY)
    console.log("🔐 Verification code:", verificationCode);
    console.log("⏰ Expires at:", expiresAt);

    // Check if Twilio credentials are configured
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
      // Send actual SMS via Twilio
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
      
      const params = new URLSearchParams();
      params.append("To", phoneNumber);
      params.append("From", twilioPhoneNumber);
      params.append("Body", `Tu código de verificación de Kentra es: ${verificationCode}. Expira en 10 minutos.`);

      const twilioResponse = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          "Authorization": "Basic " + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      });

      if (!twilioResponse.ok) {
        const error = await twilioResponse.json();
        console.error("Twilio error:", error);
        return new Response(
          JSON.stringify({ 
            error: "Error al enviar SMS",
            details: error 
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      console.log("✅ SMS sent via Twilio successfully");
    } else {
      console.warn("⚠️ Twilio not configured - code only saved to database");
      // In development, return the code (REMOVE IN PRODUCTION)
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Código de verificación generado (Twilio no configurado)",
          // ONLY FOR DEVELOPMENT:
          devCode: verificationCode
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Código de verificación enviado por SMS"
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-phone-verification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
