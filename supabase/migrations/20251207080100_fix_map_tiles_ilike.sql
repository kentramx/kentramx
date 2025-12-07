-- Migración para corregir problemas de búsqueda en get_map_tiles
-- 1. Usar ILIKE para estado/municipio (consistente con usePropertiesInfinite)
-- 2. Agregar soporte para listing_type además de for_sale/for_rent

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
  v_result jsonb;
  v_cluster_zoom integer := 10;
  v_cluster_grid_size double precision;
  v_property_type text[];
  v_min_price numeric;
  v_max_price numeric;
  v_bedrooms integer;
  v_bathrooms integer;
  v_listing_type text;
  v_estado text;
  v_municipio text;
  v_colonia text;
BEGIN
  v_tile_key := format('z%s_x%s_y%s', p_zoom, floor((p_min_lng + 180) / 360 * power(2, p_zoom)), floor((1 - ln(tan(radians(p_max_lat)) + 1 / cos(radians(p_max_lat))) / pi()) / 2 * power(2, p_zoom)));
  v_filters_hash := md5(p_filters::text);

  -- Intentar obtener resultado cacheado
  SELECT clusters, properties INTO v_cached_result
  FROM property_tiles_cache
  WHERE tile_key = v_tile_key
    AND filters_hash = v_filters_hash
    AND expires_at > now()
  LIMIT 1;

  IF v_cached_result IS NOT NULL THEN
    RETURN v_cached_result;
  END IF;

  v_cluster_grid_size := 0.05 / power(2, GREATEST(p_zoom - 5, 0));

  -- Extraer filtros del JSONB
  IF p_filters ? 'propertyType' AND jsonb_array_length(p_filters->'propertyType') > 0 THEN
    SELECT array_agg(value::text)
    INTO v_property_type
    FROM jsonb_array_elements_text(p_filters->'propertyType');
  END IF;

  IF p_filters ? 'minPrice' THEN
    v_min_price := (p_filters->>'minPrice')::numeric;
  END IF;

  IF p_filters ? 'maxPrice' THEN
    v_max_price := (p_filters->>'maxPrice')::numeric;
  END IF;

  IF p_filters ? 'bedrooms' THEN
    v_bedrooms := (p_filters->>'bedrooms')::integer;
  END IF;

  IF p_filters ? 'bathrooms' THEN
    v_bathrooms := (p_filters->>'bathrooms')::integer;
  END IF;

  IF p_filters ? 'listingType' THEN
    v_listing_type := p_filters->>'listingType';
  END IF;

  IF p_filters ? 'estado' THEN
    v_estado := p_filters->>'estado';
  END IF;

  IF p_filters ? 'municipio' THEN
    v_municipio := p_filters->>'municipio';
  END IF;

  IF p_filters ? 'colonia' THEN
    v_colonia := p_filters->>'colonia';
  END IF;

  IF p_zoom >= v_cluster_zoom THEN
    -- Zoom alto: devolver propiedades individuales
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', p.id,
      'lat', p.lat,
      'lng', p.lng,
      'price', p.price,
      'currency', p.currency,
      'title', p.title,
      'type', p.type,
      'listing_type', p.listing_type,
      'bedrooms', p.bedrooms,
      'bathrooms', p.bathrooms,
      'sqft', p.sqft,
      'municipality', p.municipality,
      'state', p.state,
      'image_url', (SELECT url FROM unnest(p.images) AS img LIMIT 1),
      'is_featured', p.is_featured,
      'created_at', p.created_at
    )), '[]'::jsonb)
    INTO v_result
    FROM properties p
    WHERE p.lat IS NOT NULL
      AND p.lng IS NOT NULL
      AND p.lat BETWEEN p_min_lat AND p_max_lat
      AND p.lng BETWEEN p_min_lng AND p_max_lng
      AND p.status = 'activa'::property_status
      -- Filtros de tipo de propiedad
      AND (v_property_type IS NULL OR p.type::text = ANY(v_property_type))
      -- Filtros de precio
      AND (v_min_price IS NULL OR p.price >= v_min_price)
      AND (v_max_price IS NULL OR p.price <= v_max_price)
      -- Filtros de características
      AND (v_bedrooms IS NULL OR p.bedrooms >= v_bedrooms)
      AND (v_bathrooms IS NULL OR p.bathrooms >= v_bathrooms)
      -- Filtro de tipo de operación (venta/renta) - ahora usa listing_type O for_sale/for_rent
      AND (v_listing_type IS NULL OR v_listing_type = '' OR
           p.listing_type = v_listing_type OR
           (v_listing_type = 'venta' AND p.for_sale = true) OR
           (v_listing_type = 'renta' AND p.for_rent = true))
      -- CORREGIDO: Usar ILIKE para búsquedas parciales de ubicación (consistente con usePropertiesInfinite)
      AND (v_estado IS NULL OR v_estado = '' OR p.state ILIKE '%' || v_estado || '%')
      AND (v_municipio IS NULL OR v_municipio = '' OR p.municipality ILIKE '%' || v_municipio || '%')
      AND (v_colonia IS NULL OR v_colonia = '' OR p.colonia ILIKE '%' || v_colonia || '%' OR p.address ILIKE '%' || v_colonia || '%');

    v_result := jsonb_build_object('properties', v_result, 'clusters', '[]'::jsonb);
  ELSE
    -- Zoom bajo: devolver clusters
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'lat', cluster_lat,
      'lng', cluster_lng,
      'count', property_count,
      'avg_price', avg_price
    )), '[]'::jsonb)
    INTO v_result
    FROM (
      SELECT
        ROUND((p.lat / v_cluster_grid_size)::numeric, 0) * v_cluster_grid_size AS cluster_lat,
        ROUND((p.lng / v_cluster_grid_size)::numeric, 0) * v_cluster_grid_size AS cluster_lng,
        COUNT(*)::integer AS property_count,
        ROUND(AVG(p.price)::numeric, 0) AS avg_price
      FROM properties p
      WHERE p.lat IS NOT NULL
        AND p.lng IS NOT NULL
        AND p.lat BETWEEN p_min_lat AND p_max_lat
        AND p.lng BETWEEN p_min_lng AND p_max_lng
        AND p.status = 'activa'::property_status
        AND (v_property_type IS NULL OR p.type::text = ANY(v_property_type))
        AND (v_min_price IS NULL OR p.price >= v_min_price)
        AND (v_max_price IS NULL OR p.price <= v_max_price)
        AND (v_bedrooms IS NULL OR p.bedrooms >= v_bedrooms)
        AND (v_bathrooms IS NULL OR p.bathrooms >= v_bathrooms)
        -- Filtro de tipo de operación armonizado
        AND (v_listing_type IS NULL OR v_listing_type = '' OR
             p.listing_type = v_listing_type OR
             (v_listing_type = 'venta' AND p.for_sale = true) OR
             (v_listing_type = 'renta' AND p.for_rent = true))
        -- CORREGIDO: Usar ILIKE para ubicación
        AND (v_estado IS NULL OR v_estado = '' OR p.state ILIKE '%' || v_estado || '%')
        AND (v_municipio IS NULL OR v_municipio = '' OR p.municipality ILIKE '%' || v_municipio || '%')
        AND (v_colonia IS NULL OR v_colonia = '' OR p.colonia ILIKE '%' || v_colonia || '%' OR p.address ILIKE '%' || v_colonia || '%')
      GROUP BY cluster_lat, cluster_lng
    ) subq;

    v_result := jsonb_build_object('properties', '[]'::jsonb, 'clusters', v_result);
  END IF;

  -- Guardar en caché
  INSERT INTO property_tiles_cache (tile_key, filters_hash, zoom, bounds, properties, clusters, property_count)
  VALUES (
    v_tile_key,
    v_filters_hash,
    p_zoom,
    ST_MakeEnvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326),
    v_result->'properties',
    v_result->'clusters',
    CASE
      WHEN p_zoom >= v_cluster_zoom THEN jsonb_array_length(v_result->'properties')
      ELSE (SELECT SUM((cluster->>'count')::integer) FROM jsonb_array_elements(v_result->'clusters') AS cluster)
    END
  )
  ON CONFLICT (tile_key, filters_hash)
  DO UPDATE SET
    properties = EXCLUDED.properties,
    clusters = EXCLUDED.clusters,
    property_count = EXCLUDED.property_count,
    expires_at = now() + interval '5 minutes',
    last_accessed_at = now(),
    access_count = property_tiles_cache.access_count + 1;

  RETURN v_result;
END;
$function$;

-- Limpiar caché para forzar regeneración con la función corregida
TRUNCATE TABLE property_tiles_cache;

-- Agregar comentario explicativo
COMMENT ON FUNCTION public.get_map_tiles IS 'Función RPC para obtener propiedades/clusters del mapa. Usa ILIKE para búsquedas de ubicación consistentes con usePropertiesInfinite. Actualizado: 2025-12-07';
