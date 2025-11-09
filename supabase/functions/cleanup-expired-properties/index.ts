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
          deletedCount: 0 
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Found ${expiredProperties.length} expired properties to delete`);

    // 2. Guardar log y eliminar propiedades
    let deletedCount = 0;
    for (const property of expiredProperties) {
      try {
        // Guardar log antes de eliminar
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

        // Eliminar imágenes del storage
        if (property.images && property.images.length > 0) {
          const filesToDelete = property.images.map((img: any) => {
            const fileName = img.url.split('/').pop();
            return `${property.id}/${fileName}`;
          });
          
          const { error: storageError } = await supabaseAdmin.storage
            .from('property-images')
            .remove(filesToDelete);

          if (storageError) {
            console.error(`Error deleting images for property ${property.id}:`, storageError);
          }
        }

        // Eliminar propiedad (las imágenes en DB se eliminan por cascade)
        const { error: deleteError } = await supabaseAdmin
          .from('properties')
          .delete()
          .eq('id', property.id);

        if (deleteError) {
          console.error(`Error deleting property ${property.id}:`, deleteError);
        } else {
          deletedCount++;
          console.log(`✓ Deleted expired property: ${property.title} (${property.id})`);
        }
      } catch (err) {
        console.error(`Error processing property ${property.id}:`, err);
      }
    }

    console.log(`Cleanup completed. Deleted ${deletedCount} properties.`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Cleanup completed successfully',
        deletedCount 
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
