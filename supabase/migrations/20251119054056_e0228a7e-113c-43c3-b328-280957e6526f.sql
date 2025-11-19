-- Fix enum comparison error in get_map_tiles function
DROP FUNCTION IF EXISTS public.get_map_tiles(double precision, double precision, double precision, double precision, integer, jsonb);

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
SET search_path TO 'public'
AS $function$
DECLARE
  v_tile_key text;
  v_filters_hash text;
  v_cached_result jsonb;
  v_cluster_zoom int := 10;
  v_result jsonb;
  v_properties jsonb;
  v_clusters jsonb;
  v_bounds geometry;
  v_price_min numeric;
  v_price_max numeric;
  v_bedrooms_min int;
  v_bathrooms_min int;
  v_type text;
  v_municipality text;
  v_state text;
  v_for_sale boolean;
  v_for_rent boolean;
BEGIN
  v_tile_key := format('%s_%s_%s_%s_%s', p_min_lng, p_min_lat, p_max_lng, p_max_lat, p_zoom);
  v_filters_hash := md5(p_filters::text);

  SELECT clusters, properties INTO v_clusters, v_properties
  FROM property_tiles_cache
  WHERE tile_key = v_tile_key
    AND filters_hash = v_filters_hash
    AND expires_at > now();

  IF v_clusters IS NOT NULL THEN
    UPDATE property_tiles_cache
    SET access_count = access_count + 1,
        last_accessed_at = now()
    WHERE tile_key = v_tile_key AND filters_hash = v_filters_hash;

    RETURN jsonb_build_object(
      'clusters', COALESCE(v_clusters, '[]'::jsonb),
      'properties', COALESCE(v_properties, '[]'::jsonb),
      'cached', true
    );
  END IF;

  v_price_min := (p_filters->>'priceMin')::numeric;
  v_price_max := (p_filters->>'priceMax')::numeric;
  v_bedrooms_min := (p_filters->>'bedrooms')::int;
  v_bathrooms_min := (p_filters->>'bathrooms')::int;
  v_type := p_filters->>'type';
  v_municipality := p_filters->>'municipality';
  v_state := p_filters->>'state';
  v_for_sale := COALESCE((p_filters->>'forSale')::boolean, true);
  v_for_rent := COALESCE((p_filters->>'forRent')::boolean, false);

  IF p_zoom >= v_cluster_zoom THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'lat', p.lat,
        'lng', p.lng,
        'price', p.price,
        'type', p.type,
        'title', p.title,
        'bedrooms', p.bedrooms,
        'bathrooms', p.bathrooms,
        'sqft', p.sqft
      )
    ) INTO v_properties
    FROM properties p
    WHERE p.lat IS NOT NULL 
      AND p.lng IS NOT NULL
      AND p.lat BETWEEN p_min_lat AND p_max_lat
      AND p.lng BETWEEN p_min_lng AND p_max_lng
      AND p.status = 'approved'::property_status
      AND (v_price_min IS NULL OR p.price >= v_price_min)
      AND (v_price_max IS NULL OR p.price <= v_price_max)
      AND (v_bedrooms_min IS NULL OR p.bedrooms >= v_bedrooms_min)
      AND (v_bathrooms_min IS NULL OR p.bathrooms >= v_bathrooms_min)
      AND (v_type IS NULL OR p.type::text = v_type)
      AND (v_municipality IS NULL OR p.municipality = v_municipality)
      AND (v_state IS NULL OR p.state = v_state)
      AND (v_for_sale = false OR p.for_sale = true)
      AND (v_for_rent = false OR p.for_rent = true);

    v_clusters := '[]'::jsonb;
  ELSE
    SELECT jsonb_agg(
      jsonb_build_object(
        'lat', centroid_lat,
        'lng', centroid_lng,
        'count', property_count
      )
    ) INTO v_clusters
    FROM (
      SELECT 
        AVG(p.lat) as centroid_lat,
        AVG(p.lng) as centroid_lng,
        COUNT(*)::int as property_count
      FROM properties p
      WHERE p.lat IS NOT NULL 
        AND p.lng IS NOT NULL
        AND p.lat BETWEEN p_min_lat AND p_max_lat
        AND p.lng BETWEEN p_min_lng AND p_max_lng
        AND p.status = 'approved'::property_status
        AND (v_price_min IS NULL OR p.price >= v_price_min)
        AND (v_price_max IS NULL OR p.price <= v_price_max)
        AND (v_bedrooms_min IS NULL OR p.bedrooms >= v_bedrooms_min)
        AND (v_bathrooms_min IS NULL OR p.bathrooms >= v_bathrooms_min)
        AND (v_type IS NULL OR p.type::text = v_type)
        AND (v_municipality IS NULL OR p.municipality = v_municipality)
        AND (v_state IS NULL OR p.state = v_state)
        AND (v_for_sale = false OR p.for_sale = true)
        AND (v_for_rent = false OR p.for_rent = true)
      GROUP BY 
        FLOOR(p.lat * 100)::int,
        FLOOR(p.lng * 100)::int
    ) clusters;

    v_properties := '[]'::jsonb;
  END IF;

  v_bounds := ST_MakeEnvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326);

  INSERT INTO property_tiles_cache (
    tile_key,
    filters_hash,
    zoom,
    bounds,
    clusters,
    properties,
    property_count,
    expires_at
  ) VALUES (
    v_tile_key,
    v_filters_hash,
    p_zoom,
    v_bounds,
    COALESCE(v_clusters, '[]'::jsonb),
    COALESCE(v_properties, '[]'::jsonb),
    COALESCE(jsonb_array_length(v_clusters), 0) + COALESCE(jsonb_array_length(v_properties), 0),
    now() + interval '5 minutes'
  )
  ON CONFLICT (tile_key, filters_hash) 
  DO UPDATE SET
    clusters = EXCLUDED.clusters,
    properties = EXCLUDED.properties,
    property_count = EXCLUDED.property_count,
    expires_at = EXCLUDED.expires_at,
    access_count = property_tiles_cache.access_count + 1,
    last_accessed_at = now();

  RETURN jsonb_build_object(
    'clusters', COALESCE(v_clusters, '[]'::jsonb),
    'properties', COALESCE(v_properties, '[]'::jsonb),
    'cached', false
  );
END;
$function$;

-- Truncar caché para forzar regeneración con la función corregida
TRUNCATE TABLE property_tiles_cache;