import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // TODO: Implement Stripe webhook handling
    // When Stripe is configured, this function will handle:
    // - checkout.session.completed → create user_subscriptions record
    // - invoice.payment_succeeded → create payment_history record
    // - customer.subscription.updated → update subscription status
    // - customer.subscription.deleted → mark subscription as canceled

    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    console.log('Webhook received:', {
      signature: signature ? 'present' : 'missing',
      bodyLength: body.length,
    });

    // Placeholder response
    return new Response(
      JSON.stringify({ message: 'Stripe webhook handler - pending implementation' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Webhook processing error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
