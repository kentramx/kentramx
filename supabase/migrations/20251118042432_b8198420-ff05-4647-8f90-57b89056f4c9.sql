-- Reescribir get_map_tiles con implementación simple y robusta
-- Objetivo: Soportar miles de propiedades, clusters en zoom bajo, propiedades individuales en zoom alto
-- Límite: 5000 propiedades máximo por llamada

DROP FUNCTION IF EXISTS get_map_tiles(numeric, numeric, numeric, numeric, integer, jsonb);

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
  v_result jsonb;
  v_status text[] := COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_filters->'status')), ARRAY['activa']);
  v_state text := NULLIF(p_filters->>'state', '');
  v_municipality text := NULLIF(p_filters->>'municipality', '');
  v_listing_type text := NULLIF(p_filters->>'listingType', '');
  v_property_type text := NULLIF(p_filters->>'propertyType', '');
  v_min_price numeric := (p_filters->>'minPrice')::numeric;
  v_max_price numeric := (p_filters->>'maxPrice')::numeric;
  v_min_bedrooms int := (p_filters->>'minBedrooms')::int;
  v_min_bathrooms int := (p_filters->>'minBathrooms')::int;
  v_max_properties int := 5000;

  v_grid_size numeric;
BEGIN
  -- Asegurar bbox válido
  IF p_min_lng IS NULL OR p_min_lat IS NULL OR p_max_lng IS NULL OR p_max_lat IS NULL THEN
    RETURN jsonb_build_object('clusters', jsonb_build_array());
  END IF;

  -- Elegir tamaño de grid según zoom para clusters
  IF p_zoom <= 3 THEN
    v_grid_size := 4.0;   -- celdas muy grandes (mundo)
  ELSIF p_zoom <= 6 THEN
    v_grid_size := 2.0;   -- país / región
  ELSIF p_zoom <= 10 THEN
    v_grid_size := 0.5;   -- estado / ciudad grande
  ELSE
    v_grid_size := 0.1;   -- refinado, casi no se usa en modo clusters
  END IF;

  IF p_zoom < 11 THEN
    -- MODO CLUSTERS
    WITH base AS (
      SELECT
        id,
        lat,
        lng,
        price,
        state,
        municipality,
        listing_type,
        type as property_type,
        bedrooms,
        bathrooms,
        status
      FROM public.properties
      WHERE lat IS NOT NULL
        AND lng IS NOT NULL
        AND lng BETWEEN p_min_lng AND p_max_lng
        AND lat BETWEEN p_min_lat AND p_max_lat
        AND (v_state IS NULL OR state = v_state)
        AND (v_municipality IS NULL OR municipality = v_municipality)
        AND (v_listing_type IS NULL OR listing_type = v_listing_type)
        AND (v_property_type IS NULL OR type::text = v_property_type)
        AND (v_min_price IS NULL OR price >= v_min_price)
        AND (v_max_price IS NULL OR price <= v_max_price)
        AND (v_min_bedrooms IS NULL OR bedrooms >= v_min_bedrooms)
        AND (v_min_bathrooms IS NULL OR bathrooms >= v_min_bathrooms)
        AND (array_length(v_status, 1) IS NULL OR status::text = ANY(v_status))
    ),
    clustered AS (
      SELECT
        ROUND(lat / v_grid_size) * v_grid_size AS lat_center,
        ROUND(lng / v_grid_size) * v_grid_size AS lng_center,
        COUNT(*) AS property_count,
        AVG(price) AS avg_price
      FROM base
      GROUP BY 1, 2
    )
    SELECT jsonb_build_object(
      'clusters',
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'lat', lat_center,
            'lng', lng_center,
            'count', property_count,
            'avg_price', avg_price
          )
        ),
        '[]'::jsonb
      )
    )
    INTO v_result
    FROM clustered;

  ELSE
    -- MODO PROPIEDADES INDIVIDUALES
    WITH base AS (
      SELECT
        p.id,
        p.title,
        p.price,
        p.currency,
        p.lat,
        p.lng,
        p.type AS property_type,
        p.listing_type,
        p.bedrooms,
        p.bathrooms,
        p.parking,
        p.sqft,
        p.municipality,
        p.state,
        p.address,
        p.agent_id,
        p.status,
        p.created_at,
        (SELECT i.url FROM images i WHERE i.property_id = p.id ORDER BY i.position LIMIT 1) AS image_url
      FROM public.properties p
      WHERE p.lat IS NOT NULL
        AND p.lng IS NOT NULL
        AND p.lng BETWEEN p_min_lng AND p_max_lng
        AND p.lat BETWEEN p_min_lat AND p_max_lat
        AND (v_state IS NULL OR p.state = v_state)
        AND (v_municipality IS NULL OR p.municipality = v_municipality)
        AND (v_listing_type IS NULL OR p.listing_type = v_listing_type)
        AND (v_property_type IS NULL OR p.type::text = v_property_type)
        AND (v_min_price IS NULL OR p.price >= v_min_price)
        AND (v_max_price IS NULL OR p.price <= v_max_price)
        AND (v_min_bedrooms IS NULL OR p.bedrooms >= v_min_bedrooms)
        AND (v_min_bathrooms IS NULL OR p.bathrooms >= v_min_bathrooms)
        AND (array_length(v_status, 1) IS NULL OR p.status::text = ANY(v_status))
      ORDER BY p.created_at DESC
      LIMIT v_max_properties
    )
    SELECT jsonb_build_object(
      'properties',
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', id,
            'title', title,
            'price', price,
            'currency', currency,
            'lat', lat,
            'lng', lng,
            'property_type', property_type,
            'listing_type', listing_type,
            'bedrooms', bedrooms,
            'bathrooms', bathrooms,
            'parking', parking,
            'sqft', sqft,
            'municipality', municipality,
            'state', state,
            'address', address,
            'image_url', image_url,
            'agent_id', agent_id,
            'status', status,
            'created_at', created_at
          )
        ),
        '[]'::jsonb
      )
    )
    INTO v_result
    FROM base;
  END IF;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;