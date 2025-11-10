import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';
// @deno-types="https://esm.sh/stripe@11.16.0/types/index.d.ts"
import Stripe from 'https://esm.sh/stripe@11.16.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') ?? '' },
        },
      }
    );

    // Verify user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { newPlanId, billingCycle, previewOnly } = await req.json();

    // Validate input
    if (!newPlanId || typeof newPlanId !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid plan ID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!billingCycle || !['monthly', 'yearly'].includes(billingCycle)) {
      return new Response(JSON.stringify({ error: 'Invalid billing cycle' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Changing subscription plan:', {
      userId: user.id,
      newPlanId,
      billingCycle,
      previewOnly: previewOnly || false,
    });

    // Check cooldown period (30 days) - only for actual changes, not previews
    if (!previewOnly) {
      const { data: recentChanges, error: changesError } = await supabaseClient
        .from('subscription_changes')
        .select('changed_at')
        .eq('user_id', user.id)
        .order('changed_at', { ascending: false })
        .limit(1);

      if (changesError) {
        console.error('Error checking recent changes:', changesError);
      }

      if (recentChanges && recentChanges.length > 0) {
        const lastChangeDate = new Date(recentChanges[0].changed_at);
        const daysSinceLastChange = Math.floor(
          (Date.now() - lastChangeDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        const cooldownDays = 30;

        if (daysSinceLastChange < cooldownDays) {
          const daysRemaining = cooldownDays - daysSinceLastChange;
          const nextChangeDate = new Date(lastChangeDate);
          nextChangeDate.setDate(nextChangeDate.getDate() + cooldownDays);

          console.log('Cooldown period active:', {
            daysSinceLastChange,
            daysRemaining,
            nextChangeDate,
          });

          return new Response(
            JSON.stringify({
              error: 'COOLDOWN_ACTIVE',
              message: `Debes esperar ${daysRemaining} día${daysRemaining > 1 ? 's' : ''} antes de cambiar de plan nuevamente`,
              daysRemaining,
              nextChangeDate: nextChangeDate.toISOString(),
              lastChangeDate: lastChangeDate.toISOString(),
            }),
            {
              status: 429,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      }
    }

    // Get current subscription
    const { data: currentSub, error: subError } = await supabaseClient
      .from('user_subscriptions')
      .select('*, subscription_plans(*)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (subError || !currentSub) {
      console.error('Subscription error:', subError);
      return new Response(JSON.stringify({ error: 'No active subscription found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get new plan details
    const { data: newPlan, error: planError } = await supabaseClient
      .from('subscription_plans')
      .select('*')
      .eq('id', newPlanId)
      .single();

    if (planError || !newPlan) {
      console.error('Plan error:', planError);
      return new Response(JSON.stringify({ error: 'Plan not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Determine new price ID
    const newPriceId = billingCycle === 'yearly' 
      ? newPlan.stripe_price_id_yearly 
      : newPlan.stripe_price_id_monthly;

    if (!newPriceId) {
      return new Response(
        JSON.stringify({ error: 'Price configuration missing for this billing cycle' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Stripe subscription
    const stripeSubscription = await stripe.subscriptions.retrieve(
      currentSub.stripe_subscription_id
    );

    // If preview only, calculate proration without applying changes
    if (previewOnly) {
      const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
        customer: currentSub.stripe_customer_id,
        subscription: currentSub.stripe_subscription_id,
        subscription_items: [{
          id: stripeSubscription.items.data[0].id,
          price: newPriceId,
        }],
        subscription_proration_behavior: 'create_prorations',
      });

      // Calculate current plan price for comparison
      const currentPlan = currentSub.subscription_plans;
      const currentPrice = currentSub.billing_cycle === 'yearly'
        ? Number(currentPlan.price_yearly)
        : Number(currentPlan.price_monthly);
      
      const newPrice = billingCycle === 'yearly'
        ? Number(newPlan.price_yearly)
        : Number(newPlan.price_monthly);

      const isUpgrade = newPrice > currentPrice;
      const isDowngrade = newPrice < currentPrice;

      console.log('Preview calculated:', {
        proratedAmount: upcomingInvoice.amount_due,
        isUpgrade,
        isDowngrade,
      });

      return new Response(
        JSON.stringify({ 
          preview: true,
          proratedAmount: upcomingInvoice.amount_due / 100, // Convert from cents
          proratedCurrency: upcomingInvoice.currency.toUpperCase(),
          isUpgrade,
          isDowngrade,
          currentPrice,
          newPrice,
          nextBillingDate: new Date(upcomingInvoice.period_end * 1000).toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Apply the subscription change
    const updatedSubscription = await stripe.subscriptions.update(
      currentSub.stripe_subscription_id,
      {
        items: [{
          id: stripeSubscription.items.data[0].id,
          price: newPriceId,
        }],
        proration_behavior: 'create_prorations',
        metadata: {
          plan_id: newPlanId,
          user_id: user.id,
          billing_cycle: billingCycle,
        },
      }
    );

    // Update database
    const { error: updateError } = await supabaseClient
      .from('user_subscriptions')
      .update({
        plan_id: newPlanId,
        billing_cycle: billingCycle,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (updateError) {
      console.error('Database update error:', updateError);
    }

    // Log the subscription change
    const currentPlan = currentSub.subscription_plans;
    const currentPrice = currentSub.billing_cycle === 'yearly'
      ? Number(currentPlan.price_yearly)
      : Number(currentPlan.price_monthly);
    
    const newPrice = billingCycle === 'yearly'
      ? Number(newPlan.price_yearly)
      : Number(newPlan.price_monthly);

    const changeType = newPrice > currentPrice ? 'upgrade' : newPrice < currentPrice ? 'downgrade' : 'cycle_change';

    const { error: logError } = await supabaseClient
      .from('subscription_changes')
      .insert({
        user_id: user.id,
        previous_plan_id: currentSub.plan_id,
        new_plan_id: newPlanId,
        previous_billing_cycle: currentSub.billing_cycle,
        new_billing_cycle: billingCycle,
        change_type: changeType,
        metadata: {
          previous_plan_name: currentPlan.name,
          new_plan_name: newPlan.name,
        },
      });

    if (logError) {
      console.error('Error logging subscription change:', logError);
    }

    console.log('Subscription updated successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        subscription: updatedSubscription,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error changing subscription plan:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
