-- Fix get_map_tiles to use 'activa' instead of 'approved'
-- This will make all 12,560 properties visible on the map

CREATE OR REPLACE FUNCTION public.get_map_tiles(
  p_min_lng double precision,
  p_min_lat double precision,
  p_max_lng double precision,
  p_max_lat double precision,
  p_zoom integer,
  p_filters jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_estado text;
  v_municipio text;
  v_listing_type text;
  v_tipo text;
  v_precio_min numeric;
  v_precio_max numeric;
  v_recamaras integer;
  v_banos integer;
  v_status text[];
  v_cluster_zoom integer := 12;
  v_cluster_distance numeric := 0.01;
  v_properties jsonb := '[]'::jsonb;
  v_clusters jsonb := '[]'::jsonb;
  v_result jsonb;
  v_property record;
  v_cluster record;
BEGIN
  -- Extract filters from JSONB
  v_estado := p_filters->>'estado';
  v_municipio := p_filters->>'municipio';
  v_listing_type := p_filters->>'listingType';
  v_tipo := p_filters->>'tipo';
  v_precio_min := (p_filters->>'precioMin')::numeric;
  v_precio_max := (p_filters->>'precioMax')::numeric;
  v_recamaras := (p_filters->>'recamaras')::integer;
  v_banos := (p_filters->>'banos')::integer;
  
  -- CRITICAL FIX: Change from 'approved' to 'activa'
  v_status := ARRAY['activa'];
  
  -- Adjust clustering based on zoom level
  IF p_zoom < 10 THEN
    v_cluster_distance := 0.05;
  ELSIF p_zoom < 12 THEN
    v_cluster_distance := 0.02;
  ELSE
    v_cluster_distance := 0.01;
  END IF;

  -- If zoom is high enough, return individual properties
  IF p_zoom >= v_cluster_zoom THEN
    FOR v_property IN
      SELECT 
        p.id,
        p.title,
        p.price,
        p.currency,
        p.type,
        p.listing_type,
        p.lat,
        p.lng,
        p.bedrooms,
        p.bathrooms,
        p.sqft,
        p.municipality,
        p.state,
        p.colonia,
        COALESCE(
          (SELECT url FROM images WHERE property_id = p.id ORDER BY position LIMIT 1),
          '/placeholder.svg'
        ) as image_url
      FROM properties p
      WHERE p.lat IS NOT NULL 
        AND p.lng IS NOT NULL
        AND p.lat BETWEEN p_min_lat AND p_max_lat
        AND p.lng BETWEEN p_min_lng AND p_max_lng
        AND p.status::text = ANY(v_status)
        AND (v_estado IS NULL OR p.state = v_estado)
        AND (v_municipio IS NULL OR p.municipality = v_municipio)
        AND (v_listing_type IS NULL OR p.listing_type = v_listing_type)
        AND (v_tipo IS NULL OR p.type::text = v_tipo)
        AND (v_precio_min IS NULL OR p.price >= v_precio_min)
        AND (v_precio_max IS NULL OR p.price <= v_precio_max)
        AND (v_recamaras IS NULL OR p.bedrooms >= v_recamaras)
        AND (v_banos IS NULL OR p.bathrooms >= v_banos)
      LIMIT 1000
    LOOP
      v_properties := v_properties || jsonb_build_object(
        'id', v_property.id,
        'title', v_property.title,
        'price', v_property.price,
        'currency', v_property.currency,
        'type', v_property.type,
        'listing_type', v_property.listing_type,
        'lat', v_property.lat,
        'lng', v_property.lng,
        'bedrooms', v_property.bedrooms,
        'bathrooms', v_property.bathrooms,
        'sqft', v_property.sqft,
        'municipality', v_property.municipality,
        'state', v_property.state,
        'colonia', v_property.colonia,
        'image_url', v_property.image_url
      );
    END LOOP;
    
    RETURN jsonb_build_object(
      'properties', v_properties,
      'clusters', '[]'::jsonb
    );
  END IF;

  -- For lower zoom levels, create clusters
  FOR v_cluster IN
    WITH clustered AS (
      SELECT 
        ROUND(p.lat / v_cluster_distance) * v_cluster_distance as cluster_lat,
        ROUND(p.lng / v_cluster_distance) * v_cluster_distance as cluster_lng,
        COUNT(*)::integer as count,
        AVG(p.price)::numeric as avg_price,
        MIN(p.price)::numeric as min_price,
        MAX(p.price)::numeric as max_price,
        array_agg(p.id) as property_ids
      FROM properties p
      WHERE p.lat IS NOT NULL 
        AND p.lng IS NOT NULL
        AND p.lat BETWEEN p_min_lat AND p_max_lat
        AND p.lng BETWEEN p_min_lng AND p_max_lng
        AND p.status::text = ANY(v_status)
        AND (v_estado IS NULL OR p.state = v_estado)
        AND (v_municipio IS NULL OR p.municipality = v_municipio)
        AND (v_listing_type IS NULL OR p.listing_type = v_listing_type)
        AND (v_tipo IS NULL OR p.type::text = v_tipo)
        AND (v_precio_min IS NULL OR p.price >= v_precio_min)
        AND (v_precio_max IS NULL OR p.price <= v_precio_max)
        AND (v_recamaras IS NULL OR p.bedrooms >= v_recamaras)
        AND (v_banos IS NULL OR p.bathrooms >= v_banos)
      GROUP BY cluster_lat, cluster_lng
    )
    SELECT * FROM clustered
  LOOP
    v_clusters := v_clusters || jsonb_build_object(
      'lat', v_cluster.cluster_lat,
      'lng', v_cluster.cluster_lng,
      'count', v_cluster.count,
      'avg_price', v_cluster.avg_price,
      'min_price', v_cluster.min_price,
      'max_price', v_cluster.max_price,
      'property_ids', v_cluster.property_ids
    );
  END LOOP;

  RETURN jsonb_build_object(
    'properties', '[]'::jsonb,
    'clusters', v_clusters
  );
END;
$$;