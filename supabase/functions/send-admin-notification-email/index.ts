import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";
import { Resend } from "npm:resend@2.0.0";
import React from "npm:react@18.3.1";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import { AdminNotificationEmail } from "./_templates/admin-notification.tsx";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationEmailRequest {
  adminEmail: string;
  adminName: string;
  notificationType: 'bypass' | 'upgrade' | 'downgrade';
  userName: string;
  planName: string;
  timestamp: string;
  isAdminChange?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
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
      console.error("Authentication error:", authError);
      return new Response(
        JSON.stringify({ error: "No autorizado" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const {
      adminEmail,
      adminName,
      notificationType,
      userName,
      planName,
      timestamp,
      isAdminChange,
    }: NotificationEmailRequest = await req.json();

    console.log("Sending admin notification email:", {
      adminEmail,
      notificationType,
      userName,
      planName,
    });

    // Generate email subject based on notification type
    let subject = "";
    if (notificationType === 'bypass') {
      subject = isAdminChange 
        ? "⚠️ Admin Forzó Cambio de Plan"
        : "⚠️ Bypass de Cooldown Detectado";
    } else if (notificationType === 'upgrade') {
      subject = "📈 Nuevo Upgrade de Plan";
    } else if (notificationType === 'downgrade') {
      subject = "📉 Downgrade de Plan Detectado";
    }

    // Render the React email template
    const html = await renderAsync(
      React.createElement(AdminNotificationEmail, {
        adminName,
        notificationType,
        userName,
        planName,
        timestamp,
        isAdminChange: isAdminChange || false,
      })
    );

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: "Kentra Admin <notificaciones@resend.dev>",
      to: [adminEmail],
      subject: subject,
      html: html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-admin-notification-email function:", error);
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
