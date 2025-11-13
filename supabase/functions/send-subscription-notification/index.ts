import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  userId: string;
  type: 'renewal_success' | 'payment_failed' | 'subscription_canceled' | 'subscription_expiring' | 'downgrade_confirmed';
  metadata?: Record<string, any>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { userId, type, metadata = {} }: NotificationRequest = await req.json();

    // Get user details
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('name')
      .eq('id', userId)
      .single();

    const { data: authUser, error: authError } = await supabaseClient.auth.admin.getUserById(userId);

    if (authError || !authUser || !authUser.user.email) {
      console.error('Error fetching user:', authError);
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userName = profile?.name || 'Usuario';
    const userEmail = authUser.user.email;

    let subject = '';
    let htmlContent = '';

    switch (type) {
      case 'renewal_success':
        subject = '✅ Renovación exitosa - Kentra';
        htmlContent = `
          <h1>¡Renovación exitosa!</h1>
          <p>Hola ${userName},</p>
          <p>Tu suscripción se ha renovado exitosamente.</p>
          <p><strong>Plan:</strong> ${metadata.planName}</p>
          <p><strong>Monto:</strong> $${metadata.amount} MXN</p>
          <p><strong>Próxima renovación:</strong> ${metadata.nextBillingDate}</p>
          <p>Gracias por confiar en Kentra.</p>
        `;
        break;

      case 'payment_failed':
        subject = '⚠️ Pago fallido - Acción requerida';
        htmlContent = `
          <h1>Pago fallido</h1>
          <p>Hola ${userName},</p>
          <p>No pudimos procesar tu pago de suscripción.</p>
          <p><strong>Plan:</strong> ${metadata.planName}</p>
          <p><strong>Monto:</strong> $${metadata.amount} MXN</p>
          <p>Por favor, actualiza tu método de pago en tu panel de control para continuar disfrutando de nuestros servicios.</p>
          <p><a href="https://kentra.com.mx/perfil?tab=subscription">Actualizar método de pago</a></p>
        `;
        break;

      case 'subscription_canceled':
        subject = 'Suscripción cancelada - Kentra';
        htmlContent = `
          <h1>Suscripción cancelada</h1>
          <p>Hola ${userName},</p>
          <p>Tu suscripción ha sido cancelada y finalizará el ${metadata.endDate}.</p>
          <p>Puedes seguir usando todas las funciones hasta esa fecha.</p>
          <p>Si cambias de opinión, puedes reactivar tu suscripción en cualquier momento desde tu panel.</p>
          <p><a href="https://kentra.com.mx/perfil?tab=subscription">Gestionar suscripción</a></p>
        `;
        break;

      case 'subscription_expiring':
        subject = '⏰ Tu suscripción expira pronto';
        htmlContent = `
          <h1>Tu suscripción está por expirar</h1>
          <p>Hola ${userName},</p>
          <p>Tu suscripción al plan <strong>${metadata.planName}</strong> expirará en ${metadata.daysRemaining} días (${metadata.endDate}).</p>
          <p>Para continuar disfrutando de nuestros servicios, asegúrate de que tu método de pago esté actualizado.</p>
          <p><a href="https://kentra.com.mx/perfil?tab=subscription">Ver mi suscripción</a></p>
        `;
        break;

      case 'downgrade_confirmed':
        subject = 'Cambio de plan confirmado - Kentra';
        htmlContent = `
          <h1>Cambio de plan confirmado</h1>
          <p>Hola ${userName},</p>
          <p>Tu cambio de plan se ha procesado exitosamente.</p>
          <p><strong>Plan anterior:</strong> ${metadata.previousPlan}</p>
          <p><strong>Nuevo plan:</strong> ${metadata.newPlan}</p>
          <p><strong>Efectivo desde:</strong> ${metadata.effectiveDate}</p>
          ${metadata.propertiesRemoved > 0 ? `<p><strong>⚠️ Importante:</strong> ${metadata.propertiesRemoved} propiedades fueron pausadas porque exceden el límite de tu nuevo plan.</p>` : ''}
          <p><a href="https://kentra.com.mx/panel-agente">Ir a mi panel</a></p>
        `;
        break;

      default:
        return new Response(JSON.stringify({ error: 'Invalid notification type' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const emailResponse = await resend.emails.send({
      from: 'Kentra <noreply@updates.kentra.com.mx>',
      to: [userEmail],
      subject,
      html: htmlContent,
    });

    console.log('Notification sent:', { type, userId, emailResponse });

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending notification:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
