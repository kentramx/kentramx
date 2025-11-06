import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AgentStats {
  total_properties: number;
  active_properties: number;
  total_views: number;
  total_favorites: number;
  total_conversations: number;
  conversion_rate: number;
}

interface PropertyPerformance {
  title: string;
  views: number;
  favorites: number;
  conversations: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { format = 'csv' } = await req.json();

    console.log(`Exporting analytics for agent ${user.id} in format ${format}`);

    // Get agent stats
    const { data: statsData, error: statsError } = await supabaseClient
      .rpc('get_agent_stats', { agent_uuid: user.id });

    if (statsError) throw statsError;

    const stats: AgentStats = statsData?.[0] || {
      total_properties: 0,
      active_properties: 0,
      total_views: 0,
      total_favorites: 0,
      total_conversations: 0,
      conversion_rate: 0,
    };

    // Get property performance
    const { data: propertiesData, error: propertiesError } = await supabaseClient
      .from('properties')
      .select(`
        title,
        property_views!inner (id),
        favorites (id),
        conversations (id)
      `)
      .eq('agent_id', user.id);

    if (propertiesError) throw propertiesError;

    // Process property performance data
    const propertyPerformance: PropertyPerformance[] = [];
    const propertyMap = new Map();

    propertiesData?.forEach((p: any) => {
      if (!propertyMap.has(p.title)) {
        propertyMap.set(p.title, {
          title: p.title,
          views: 0,
          favorites: 0,
          conversations: 0,
        });
      }
    });

    // Count views
    propertiesData?.forEach((p: any) => {
      if (p.property_views) {
        const prop = propertyMap.get(p.title);
        prop.views++;
      }
    });

    // Get actual counts
    const { data: viewCounts } = await supabaseClient
      .from('property_views')
      .select('property_id, properties!inner(title, agent_id)')
      .eq('properties.agent_id', user.id);

    const viewMap = new Map();
    viewCounts?.forEach((v: any) => {
      const title = v.properties?.title;
      if (title) {
        viewMap.set(title, (viewMap.get(title) || 0) + 1);
      }
    });

    // Get favorite counts
    const { data: favCounts } = await supabaseClient
      .from('favorites')
      .select('property_id, properties!inner(title, agent_id)')
      .eq('properties.agent_id', user.id);

    const favMap = new Map();
    favCounts?.forEach((f: any) => {
      const title = f.properties?.title;
      if (title) {
        favMap.set(title, (favMap.get(title) || 0) + 1);
      }
    });

    // Get conversation counts
    const { data: convCounts } = await supabaseClient
      .from('conversations')
      .select('property_id, properties!inner(title, agent_id)')
      .eq('agent_id', user.id);

    const convMap = new Map();
    convCounts?.forEach((c: any) => {
      const title = c.properties?.title;
      if (title) {
        convMap.set(title, (convMap.get(title) || 0) + 1);
      }
    });

    // Combine all data
    const allTitles = new Set([
      ...viewMap.keys(),
      ...favMap.keys(),
      ...convMap.keys(),
    ]);

    allTitles.forEach((title) => {
      propertyPerformance.push({
        title,
        views: viewMap.get(title) || 0,
        favorites: favMap.get(title) || 0,
        conversations: convMap.get(title) || 0,
      });
    });

    if (format === 'csv') {
      // Generate CSV
      const csvLines = [
        'REPORTE DE ANALÍTICAS DEL AGENTE',
        '',
        'ESTADÍSTICAS GENERALES',
        'Métrica,Valor',
        `Total de Propiedades,${stats.total_properties}`,
        `Propiedades Activas,${stats.active_properties}`,
        `Total de Vistas,${stats.total_views}`,
        `Total de Favoritos,${stats.total_favorites}`,
        `Total de Conversaciones,${stats.total_conversations}`,
        `Tasa de Conversión,${stats.conversion_rate}%`,
        '',
        'RENDIMIENTO POR PROPIEDAD',
        'Propiedad,Vistas,Favoritos,Conversaciones',
        ...propertyPerformance.map(
          (p) => `"${p.title}",${p.views},${p.favorites},${p.conversations}`
        ),
      ];

      const csv = csvLines.join('\n');

      return new Response(csv, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="analytics-report-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    } else if (format === 'json') {
      // Return JSON format for client-side PDF generation
      const reportData = {
        stats,
        propertyPerformance,
        generatedAt: new Date().toISOString(),
      };

      return new Response(JSON.stringify(reportData), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid format' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error exporting analytics:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});