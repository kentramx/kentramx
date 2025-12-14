
-- ============================================
-- MIGRACIÓN: Correcciones de Seguridad (Final)
-- ============================================

-- DROP funciones con conflicto de return type
DROP FUNCTION IF EXISTS public.database_health_check();

-- database_health_check con TABLE return type original y SET search_path
CREATE OR REPLACE FUNCTION public.database_health_check()
RETURNS TABLE(metric text, value text, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 'total_properties'::text, (SELECT COUNT(*)::text FROM properties), 'ok'::text
  UNION ALL
  SELECT 'active_properties'::text, (SELECT COUNT(*)::text FROM properties WHERE properties.status = 'activa'), 'ok'::text
  UNION ALL
  SELECT 'total_users'::text, (SELECT COUNT(*)::text FROM profiles), 'ok'::text
  UNION ALL
  SELECT 'active_subscriptions'::text, (SELECT COUNT(*)::text FROM user_subscriptions WHERE user_subscriptions.status = 'active'), 'ok'::text
  UNION ALL
  SELECT 'trialing_subscriptions'::text, (SELECT COUNT(*)::text FROM user_subscriptions WHERE user_subscriptions.status = 'trialing'), 'ok'::text;
END;
$function$;

-- get_map_data con SET search_path
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

-- normalize_state_name
CREATE OR REPLACE FUNCTION public.normalize_state_name(input_state text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
DECLARE
  normalized text;
BEGIN
  normalized := LOWER(TRIM(unaccent(input_state)));
  
  CASE normalized
    WHEN 'cdmx', 'ciudad de mexico', 'df', 'distrito federal' THEN
      RETURN 'Ciudad de México';
    WHEN 'estado de mexico', 'edomex' THEN
      RETURN 'Estado de México';
    WHEN 'nuevo leon', 'nl' THEN
      RETURN 'Nuevo León';
    WHEN 'jalisco', 'jal' THEN
      RETURN 'Jalisco';
    WHEN 'quintana roo', 'qroo' THEN
      RETURN 'Quintana Roo';
    ELSE
      RETURN input_state;
  END CASE;
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

-- generate_property_code
CREATE OR REPLACE FUNCTION public.generate_property_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    new_code := 'KEN-' || UPPER(SUBSTRING(md5(random()::text) FROM 1 FOR 6));
    SELECT EXISTS(SELECT 1 FROM properties WHERE property_code = new_code) INTO code_exists;
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$function$;

-- set_property_code trigger function
CREATE OR REPLACE FUNCTION public.set_property_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.property_code IS NULL THEN
    NEW.property_code := generate_property_code();
  END IF;
  RETURN NEW;
END;
$function$;

-- update_phone_verifications_updated_at
CREATE OR REPLACE FUNCTION public.update_phone_verifications_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- refresh_agent_stats
CREATE OR REPLACE FUNCTION public.refresh_agent_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NULL;
END;
$function$;

-- cleanup_old_data
CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM phone_verifications WHERE expires_at < NOW() - INTERVAL '7 days';
  DELETE FROM processed_webhook_events WHERE processed_at < NOW() - INTERVAL '30 days';
  DELETE FROM pending_payments WHERE expires_at < NOW() AND status = 'pending';
END;
$function$;
