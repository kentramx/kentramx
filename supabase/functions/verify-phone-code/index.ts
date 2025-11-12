import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyRequest {
  code: string;
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

    const { code }: VerifyRequest = await req.json();

    if (!code || code.length !== 6) {
      return new Response(
        JSON.stringify({ error: "Código inválido" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("🔍 Verifying code for user:", user.id);

    // Get user's profile with verification code
    const { data: profile, error: fetchError } = await supabaseClient
      .from("profiles")
      .select("phone_verification_code, phone_verification_expires_at, phone")
      .eq("id", user.id)
      .single();

    if (fetchError || !profile) {
      console.error("Error fetching profile:", fetchError);
      return new Response(
        JSON.stringify({ error: "Error al verificar código" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if code exists
    if (!profile.phone_verification_code) {
      return new Response(
        JSON.stringify({ error: "No hay código de verificación pendiente" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if code matches
    if (profile.phone_verification_code !== code) {
      return new Response(
        JSON.stringify({ error: "Código incorrecto" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if code is expired
    const expiresAt = new Date(profile.phone_verification_expires_at);
    if (expiresAt < new Date()) {
      return new Response(
        JSON.stringify({ error: "El código ha expirado. Solicita uno nuevo" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("✅ Code verified successfully");

    // Mark phone as verified and clear verification code
    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update({
        phone_verified: true,
        phone_verified_at: new Date().toISOString(),
        phone_verification_code: null,
        phone_verification_expires_at: null,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return new Response(
        JSON.stringify({ error: "Error al actualizar verificación" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Teléfono verificado exitosamente"
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in verify-phone-code:", error);
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
