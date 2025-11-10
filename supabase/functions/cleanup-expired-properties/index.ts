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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log('Starting cleanup of expired properties...');

    // 1. Buscar propiedades expiradas
    const { data: expiredProperties, error: fetchError } = await supabaseAdmin
      .from('properties')
      .select('id, agent_id, title, last_renewed_at, created_at, images(url)')
      .lt('expires_at', new Date().toISOString());

    if (fetchError) {
      console.error('Error fetching expired properties:', fetchError);
      throw fetchError;
    }

    if (!expiredProperties || expiredProperties.length === 0) {
      console.log('No expired properties found');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No expired properties found',
          pausedCount: 0 
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Found ${expiredProperties.length} expired properties to pause`);

    // 2. Guardar log y pausar propiedades (NO eliminar)
    let pausedCount = 0;
    for (const property of expiredProperties) {
      try {
        // Guardar log antes de pausar
        const { error: logError } = await supabaseAdmin
          .from('property_expiration_log')
          .insert({
            property_id: property.id,
            agent_id: property.agent_id,
            property_title: property.title,
            last_renewed_at: property.last_renewed_at,
            property_created_at: property.created_at,
          });

        if (logError) {
          console.error(`Error logging property ${property.id}:`, logError);
        }

        // Pausar propiedad en lugar de eliminarla
        const { error: pauseError } = await supabaseAdmin
          .from('properties')
          .update({ 
            status: 'pausada',
            rejection_reason: null // No es rechazo, es pausa por expiración
          })
          .eq('id', property.id);

        if (pauseError) {
          console.error(`Error pausing property ${property.id}:`, pauseError);
        } else {
          pausedCount++;
          console.log(`✓ Paused expired property: ${property.title} (${property.id})`);
        }
      } catch (err) {
        console.error(`Error processing property ${property.id}:`, err);
      }
    }

    console.log(`Cleanup completed. Paused ${pausedCount} properties.`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Cleanup completed successfully',
        pausedCount 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in cleanup-expired-properties:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
