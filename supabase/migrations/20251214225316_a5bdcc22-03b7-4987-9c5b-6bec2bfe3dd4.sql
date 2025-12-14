
-- ============================================
-- MIGRACIÓN: Funciones restantes con SET search_path
-- ============================================

-- cleanup_old_webhook_events (ya con DROP previo exitoso)
CREATE OR REPLACE FUNCTION public.cleanup_old_webhook_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count integer := 0;
BEGIN
  DELETE FROM stripe_webhook_events 
  WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  DELETE FROM processed_webhook_events 
  WHERE processed_at < NOW() - INTERVAL '90 days';
  
  RETURN deleted_count;
END;
$function$;

-- generate_filters_hash
CREATE OR REPLACE FUNCTION public.generate_filters_hash(
  p_listing_type text DEFAULT NULL,
  p_property_type text DEFAULT NULL,
  p_price_min numeric DEFAULT NULL,
  p_price_max numeric DEFAULT NULL,
  p_bedrooms integer DEFAULT NULL,
  p_bathrooms integer DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_municipality text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN md5(
    COALESCE(p_listing_type, '') || '|' ||
    COALESCE(p_property_type, '') || '|' ||
    COALESCE(p_price_min::text, '') || '|' ||
    COALESCE(p_price_max::text, '') || '|' ||
    COALESCE(p_bedrooms::text, '') || '|' ||
    COALESCE(p_bathrooms::text, '') || '|' ||
    COALESCE(p_state, '') || '|' ||
    COALESCE(p_municipality, '')
  );
END;
$function$;

-- get_map_data
CREATE OR REPLACE FUNCTION public.get_map_data(
  p_north double precision,
  p_south double precision,
  p_east double precision,
  p_west double precision,
  p_zoom integer DEFAULT 10,
  p_listing_type text DEFAULT NULL,
  p_property_type text DEFAULT NULL,
  p_price_min numeric DEFAULT NULL,
  p_price_max numeric DEFAULT NULL,
  p_bedrooms integer DEFAULT NULL,
  p_bathrooms integer DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_municipality text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result JSON;
  grid_size double precision;
  property_count integer;
  should_cluster boolean;
BEGIN
  grid_size := CASE 
    WHEN p_zoom >= 16 THEN 0.001
    WHEN p_zoom >= 14 THEN 0.005
    WHEN p_zoom >= 12 THEN 0.01
    WHEN p_zoom >= 10 THEN 0.05
    WHEN p_zoom >= 8 THEN 0.1
    ELSE 0.5
  END;
  
  SELECT COUNT(*) INTO property_count
  FROM properties p
  WHERE p.lat IS NOT NULL 
    AND p.lng IS NOT NULL
    AND p.lat BETWEEN p_south AND p_north
    AND p.lng BETWEEN p_west AND p_east
    AND p.status = 'activa'
    AND (p_listing_type IS NULL OR p.listing_type = p_listing_type)
    AND (p_property_type IS NULL OR p.type::text = p_property_type)
    AND (p_price_min IS NULL OR p.price >= p_price_min)
    AND (p_price_max IS NULL OR p.price <= p_price_max)
    AND (p_bedrooms IS NULL OR p.bedrooms >= p_bedrooms)
    AND (p_bathrooms IS NULL OR p.bathrooms >= p_bathrooms);
  
  should_cluster := p_zoom < 14 AND property_count > 500;
  
  IF should_cluster THEN
    SELECT json_build_object(
      'is_clustered', true,
      'total_count', property_count,
      'properties', '[]'::json,
      'clusters', COALESCE((
        SELECT json_agg(row_to_json(c))
        FROM (
          SELECT 
            ROUND(lat / grid_size) * grid_size + grid_size/2 as lat,
            ROUND(lng / grid_size) * grid_size + grid_size/2 as lng,
            COUNT(*) as count,
            ROUND(AVG(price)) as avg_price,
            p_zoom + 2 as expansion_zoom
          FROM properties p
          WHERE p.lat IS NOT NULL 
            AND p.lng IS NOT NULL
            AND p.lat BETWEEN p_south AND p_north
            AND p.lng BETWEEN p_west AND p_east
            AND p.status = 'activa'
            AND (p_listing_type IS NULL OR p.listing_type = p_listing_type)
            AND (p_property_type IS NULL OR p.type::text = p_property_type)
            AND (p_price_min IS NULL OR p.price >= p_price_min)
            AND (p_price_max IS NULL OR p.price <= p_price_max)
            AND (p_bedrooms IS NULL OR p.bedrooms >= p_bedrooms)
            AND (p_bathrooms IS NULL OR p.bathrooms >= p_bathrooms)
          GROUP BY ROUND(lat / grid_size), ROUND(lng / grid_size)
          HAVING COUNT(*) > 1
        ) c
      ), '[]'::json)
    ) INTO result;
  ELSE
    SELECT json_build_object(
      'is_clustered', false,
      'total_count', property_count,
      'clusters', '[]'::json,
      'properties', COALESCE((
        SELECT json_agg(row_to_json(p))
        FROM (
          SELECT 
            id,
            title,
            price,
            currency,
            lat,
            lng,
            type,
            listing_type,
            bedrooms,
            bathrooms,
            sqft,
            municipality,
            state,
            (SELECT url FROM images WHERE property_id = props.id ORDER BY position LIMIT 1) as image_url
          FROM properties props
          WHERE lat IS NOT NULL 
            AND lng IS NOT NULL
            AND lat BETWEEN p_south AND p_north
            AND lng BETWEEN p_west AND p_east
            AND status = 'activa'
            AND (p_listing_type IS NULL OR listing_type = p_listing_type)
            AND (p_property_type IS NULL OR type::text = p_property_type)
            AND (p_price_min IS NULL OR price >= p_price_min)
            AND (p_price_max IS NULL OR price <= p_price_max)
            AND (p_bedrooms IS NULL OR bedrooms >= p_bedrooms)
            AND (p_bathrooms IS NULL OR bathrooms >= p_bathrooms)
          LIMIT 500
        ) p
      ), '[]'::json)
    ) INTO result;
  END IF;
  
  RETURN result;
END;
$function$;

-- normalize_location
CREATE OR REPLACE FUNCTION public.normalize_location(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN LOWER(TRIM(
    REGEXP_REPLACE(
      unaccent(input_text),
      '[^a-zA-Z0-9\s]',
      '',
      'g'
    )
  ));
END;
$function$;
