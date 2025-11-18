-- =====================================================
-- MIGRACIÓN COMPLETA: Solución definitiva para CDMX y listingType
-- =====================================================
-- Esta migración actualiza ambas funciones RPC (get_properties_cursor y get_map_tiles)
-- para manejar correctamente:
-- 1. Ciudad de México: ignorar municipality='Ciudad de México' cuando state='Ciudad de México'
-- 2. listingType: tolerar 'sale'/'rent' mapeándolos a 'venta'/'renta'
-- 3. Consistencia en comparaciones de status y tipos

-- =====================================================
-- PARTE 1: Actualizar get_properties_cursor
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_properties_cursor(
  p_cursor uuid DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_state text DEFAULT NULL,
  p_municipality text DEFAULT NULL,
  p_type text DEFAULT NULL,
  p_listing_type text DEFAULT NULL,
  p_price_min numeric DEFAULT NULL,
  p_price_max numeric DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  price numeric,
  currency text,
  type text,
  listing_type text,
  for_sale boolean,
  for_rent boolean,
  sale_price numeric,
  rent_price numeric,
  address text,
  colonia text,
  municipality text,
  state text,
  lat numeric,
  lng numeric,
  bedrooms integer,
  bathrooms integer,
  sqft numeric,
  lot_size numeric,
  parking integer,
  amenities jsonb,
  description text,
  video_url text,
  created_at timestamp with time zone,
  agent_id uuid
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_normalized_listing_type text;
  v_normalized_municipality text;
BEGIN
  -- Normalizar listingType: tolerar inglés
  v_normalized_listing_type := p_listing_type;
  IF p_listing_type = 'sale' THEN
    v_normalized_listing_type := 'venta';
  ELSIF p_listing_type = 'rent' THEN
    v_normalized_listing_type := 'renta';
  END IF;
  
  -- Normalizar municipality: ignorar 'Ciudad de México' cuando state='Ciudad de México'
  v_normalized_municipality := p_municipality;
  IF p_state = 'Ciudad de México' AND p_municipality = 'Ciudad de México' THEN
    v_normalized_municipality := NULL;
  END IF;
  
  RETURN QUERY
  SELECT
    p.id,
    p.title,
    p.price,
    p.currency,
    p.type::text,
    p.listing_type,
    p.for_sale,
    p.for_rent,
    p.sale_price,
    p.rent_price,
    p.address,
    p.colonia,
    p.municipality,
    p.state,
    p.lat,
    p.lng,
    p.bedrooms,
    p.bathrooms,
    p.sqft,
    p.lot_size,
    p.parking,
    p.amenities,
    p.description,
    p.video_url,
    p.created_at,
    p.agent_id
  FROM public.properties p
  WHERE 
    p.status = 'activa'
    AND (p_cursor IS NULL OR p.id < p_cursor)
    AND (p_state IS NULL OR p.state = p_state)
    AND (v_normalized_municipality IS NULL OR p.municipality = v_normalized_municipality)
    AND (p_type IS NULL OR p.type::text = p_type)
    AND (v_normalized_listing_type IS NULL OR p.listing_type = v_normalized_listing_type)
    AND (p_price_min IS NULL OR p.price >= p_price_min)
    AND (p_price_max IS NULL OR p.price <= p_price_max)
  ORDER BY p.id DESC
  LIMIT p_limit;
END;
$$;

-- =====================================================
-- PARTE 2: Actualizar get_map_tiles (versión definitiva)
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_map_tiles(
  p_bounds jsonb,
  p_zoom integer,
  p_filters jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_result jsonb;
  v_bounds_geom geometry;
  v_clusters jsonb;
  v_properties jsonb;
  v_tile_key text;
  v_filters_hash text;
  v_cached_result jsonb;
  v_listing_type text;
  v_municipality text;
BEGIN
  -- Extraer bounds
  v_bounds_geom := ST_MakeEnvelope(
    (p_bounds->>'west')::float,
    (p_bounds->>'south')::float,
    (p_bounds->>'east')::float,
    (p_bounds->>'north')::float,
    4326
  );
  
  -- Generar tile_key y filters_hash para caché
  v_tile_key := format('z%s_%.6f_%.6f_%.6f_%.6f',
    p_zoom,
    (p_bounds->>'west')::float,
    (p_bounds->>'south')::float,
    (p_bounds->>'east')::float,
    (p_bounds->>'north')::float
  );
  v_filters_hash := md5(p_filters::text);
  
  -- Normalizar listingType (tolerar inglés)
  v_listing_type := p_filters->>'listingType';
  IF v_listing_type = 'sale' THEN
    v_listing_type := 'venta';
  ELSIF v_listing_type = 'rent' THEN
    v_listing_type := 'renta';
  END IF;
  
  -- Normalizar municipality (ignorar 'Ciudad de México' cuando state='Ciudad de México')
  v_municipality := p_filters->>'municipio';
  IF (p_filters->>'estado') = 'Ciudad de México' AND v_municipality = 'Ciudad de México' THEN
    v_municipality := NULL;
  END IF;
  
  -- Intentar leer de caché
  SELECT 
    CASE 
      WHEN clusters IS NOT NULL THEN jsonb_build_object('clusters', clusters)
      WHEN properties IS NOT NULL THEN jsonb_build_object('properties', properties)
      ELSE NULL
    END
  INTO v_cached_result
  FROM public.property_tiles_cache
  WHERE tile_key = v_tile_key
    AND filters_hash = v_filters_hash
    AND expires_at > NOW()
  LIMIT 1;
  
  IF v_cached_result IS NOT NULL THEN
    -- Actualizar access stats
    UPDATE public.property_tiles_cache
    SET 
      access_count = access_count + 1,
      last_accessed_at = NOW()
    WHERE tile_key = v_tile_key AND filters_hash = v_filters_hash;
    
    RETURN v_cached_result;
  END IF;
  
  -- Si zoom bajo (<11), retornar clusters
  IF p_zoom < 11 THEN
    SELECT jsonb_agg(jsonb_build_object(
      'lat', avg_lat,
      'lng', avg_lng,
      'count', property_count,
      'avgPrice', avg_price
    ))
    INTO v_clusters
    FROM (
      SELECT
        AVG(p.lat) as avg_lat,
        AVG(p.lng) as avg_lng,
        COUNT(*) as property_count,
        AVG(p.price) as avg_price
      FROM public.properties p
      WHERE 
        p.status = 'activa'
        AND p.lat IS NOT NULL
        AND p.lng IS NOT NULL
        AND ST_Intersects(p.geom, v_bounds_geom)
        AND ((p_filters->>'estado') IS NULL OR p.state = (p_filters->>'estado'))
        AND (v_municipality IS NULL OR p.municipality = v_municipality)
        AND ((p_filters->>'tipo') IS NULL OR p.type::text = (p_filters->>'tipo'))
        AND (v_listing_type IS NULL OR p.listing_type = v_listing_type)
        AND ((p_filters->>'precioMin') IS NULL OR p.price >= (p_filters->>'precioMin')::numeric)
        AND ((p_filters->>'precioMax') IS NULL OR p.price <= (p_filters->>'precioMax')::numeric)
      GROUP BY ST_SnapToGrid(p.geom, 0.05, 0.05)
      HAVING COUNT(*) >= 2
      LIMIT 200
    ) clustered;
    
    v_result := jsonb_build_object('clusters', COALESCE(v_clusters, '[]'::jsonb));
    
    -- Guardar en caché
    INSERT INTO public.property_tiles_cache (
      tile_key, filters_hash, zoom, bounds, clusters, property_count, expires_at
    )
    VALUES (
      v_tile_key,
      v_filters_hash,
      p_zoom,
      v_bounds_geom,
      v_clusters,
      jsonb_array_length(COALESCE(v_clusters, '[]'::jsonb)),
      NOW() + INTERVAL '5 minutes'
    )
    ON CONFLICT (tile_key, filters_hash) DO UPDATE SET
      clusters = EXCLUDED.clusters,
      property_count = EXCLUDED.property_count,
      access_count = property_tiles_cache.access_count + 1,
      last_accessed_at = NOW(),
      expires_at = EXCLUDED.expires_at;
    
    RETURN v_result;
  END IF;
  
  -- Si zoom alto (>=11), retornar propiedades individuales (límite 500)
  SELECT jsonb_agg(jsonb_build_object(
    'id', p.id,
    'title', p.title,
    'price', p.price,
    'currency', p.currency,
    'type', p.type,
    'listing_type', p.listing_type,
    'lat', p.lat,
    'lng', p.lng,
    'address', p.address,
    'colonia', p.colonia,
    'municipality', p.municipality,
    'state', p.state,
    'bedrooms', p.bedrooms,
    'bathrooms', p.bathrooms,
    'sqft', p.sqft
  ))
  INTO v_properties
  FROM (
    SELECT *
    FROM public.properties p
    WHERE 
      p.status = 'activa'
      AND p.lat IS NOT NULL
      AND p.lng IS NOT NULL
      AND ST_Intersects(p.geom, v_bounds_geom)
      AND ((p_filters->>'estado') IS NULL OR p.state = (p_filters->>'estado'))
      AND (v_municipality IS NULL OR p.municipality = v_municipality)
      AND ((p_filters->>'tipo') IS NULL OR p.type::text = (p_filters->>'tipo'))
      AND (v_listing_type IS NULL OR p.listing_type = v_listing_type)
      AND ((p_filters->>'precioMin') IS NULL OR p.price >= (p_filters->>'precioMin')::numeric)
      AND ((p_filters->>'precioMax') IS NULL OR p.price <= (p_filters->>'precioMax')::numeric)
    LIMIT 500
  ) p;
  
  v_result := jsonb_build_object('properties', COALESCE(v_properties, '[]'::jsonb));
  
  -- Guardar en caché
  INSERT INTO public.property_tiles_cache (
    tile_key, filters_hash, zoom, bounds, properties, property_count, expires_at
  )
  VALUES (
    v_tile_key,
    v_filters_hash,
    p_zoom,
    v_bounds_geom,
    v_properties,
    jsonb_array_length(COALESCE(v_properties, '[]'::jsonb)),
    NOW() + INTERVAL '5 minutes'
  )
  ON CONFLICT (tile_key, filters_hash) DO UPDATE SET
    properties = EXCLUDED.properties,
    property_count = EXCLUDED.property_count,
    access_count = property_tiles_cache.access_count + 1,
    last_accessed_at = NOW(),
    expires_at = EXCLUDED.expires_at;
  
  RETURN v_result;
END;
$$;

-- =====================================================
-- Crear índices para optimización (si no existen)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_properties_status_geom ON public.properties USING gist(geom) WHERE status = 'activa';
CREATE INDEX IF NOT EXISTS idx_properties_status_state ON public.properties(status, state) WHERE status = 'activa';
CREATE INDEX IF NOT EXISTS idx_properties_listing_type ON public.properties(listing_type) WHERE status = 'activa';