-- Corregir get_property_clusters con type casting
CREATE OR REPLACE FUNCTION get_property_clusters(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision,
  zoom_level integer,
  p_status text DEFAULT 'activa',
  p_state text DEFAULT NULL,
  p_municipality text DEFAULT NULL,
  p_type text DEFAULT NULL,
  p_listing_type text DEFAULT NULL,
  p_price_min numeric DEFAULT NULL,
  p_price_max numeric DEFAULT NULL,
  p_bedrooms integer DEFAULT NULL,
  p_bathrooms integer DEFAULT NULL
)
RETURNS TABLE(
  cluster_id text,
  lat double precision,
  lng double precision,
  property_count integer,
  avg_price numeric,
  property_ids text[]
) AS $$
DECLARE
  grid_size double precision;
BEGIN
  grid_size := CASE 
    WHEN zoom_level >= 15 THEN 0.001
    WHEN zoom_level >= 13 THEN 0.005
    WHEN zoom_level >= 11 THEN 0.02
    WHEN zoom_level >= 9 THEN 0.1
    ELSE 0.5
  END;

  RETURN QUERY
  WITH filtered_properties AS (
    SELECT 
      p.id,
      ST_X(p.geom) as lng,
      ST_Y(p.geom) as lat,
      p.price
    FROM properties p
    WHERE p.geom && ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
      AND p.status::text = p_status
      AND (p_state IS NULL OR p.state = p_state)
      AND (p_municipality IS NULL OR p.municipality = p_municipality)
      AND (p_type IS NULL OR p.type::text = p_type)
      AND (p_listing_type IS NULL OR 
           (p_listing_type = 'venta' AND p.for_sale = true) OR
           (p_listing_type = 'renta' AND p.for_rent = true))
      AND (p_price_min IS NULL OR p.price >= p_price_min)
      AND (p_price_max IS NULL OR p.price <= p_price_max)
      AND (p_bedrooms IS NULL OR p.bedrooms >= p_bedrooms)
      AND (p_bathrooms IS NULL OR p.bathrooms >= p_bathrooms)
  ),
  clusters AS (
    SELECT
      FLOOR(lng / grid_size)::text || '_' || FLOOR(lat / grid_size)::text as cluster_id,
      AVG(lng) as lng,
      AVG(lat) as lat,
      COUNT(*)::integer as property_count,
      ROUND(AVG(price), 2) as avg_price,
      array_agg(id::text) as property_ids
    FROM filtered_properties
    GROUP BY FLOOR(lng / grid_size), FLOOR(lat / grid_size)
  )
  SELECT * FROM clusters;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Corregir get_properties_in_viewport con type casting
CREATE OR REPLACE FUNCTION get_properties_in_viewport(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision,
  p_status text DEFAULT 'activa',
  p_state text DEFAULT NULL,
  p_municipality text DEFAULT NULL,
  p_type text DEFAULT NULL,
  p_listing_type text DEFAULT NULL,
  p_price_min numeric DEFAULT NULL,
  p_price_max numeric DEFAULT NULL,
  p_bedrooms integer DEFAULT NULL,
  p_bathrooms integer DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  title text,
  price numeric,
  bedrooms integer,
  bathrooms integer,
  parking integer,
  lat numeric,
  lng numeric,
  address text,
  state text,
  municipality text,
  type text,
  listing_type text,
  sqft numeric,
  agent_id uuid,
  status text,
  created_at timestamptz,
  is_featured boolean,
  images jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.price,
    p.bedrooms,
    p.bathrooms,
    p.parking,
    ST_Y(p.geom) as lat,
    ST_X(p.geom) as lng,
    p.address,
    p.state,
    p.municipality,
    p.type::text,
    p.listing_type,
    p.sqft,
    p.agent_id,
    p.status::text,
    p.created_at,
    EXISTS(
      SELECT 1 FROM featured_properties fp 
      WHERE fp.property_id = p.id 
        AND fp.status = 'active' 
        AND fp.end_date > NOW()
    ) as is_featured,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object('url', i.url, 'position', i.position)
          ORDER BY i.position
        )
        FROM images i
        WHERE i.property_id = p.id
      ),
      '[]'::jsonb
    ) as images
  FROM properties p
  WHERE p.geom && ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
    AND p.status::text = p_status
    AND (p_state IS NULL OR p.state = p_state)
    AND (p_municipality IS NULL OR p.municipality = p_municipality)
    AND (p_type IS NULL OR p.type::text = p_type)
    AND (p_listing_type IS NULL OR 
         (p_listing_type = 'venta' AND p.for_sale = true) OR
         (p_listing_type = 'renta' AND p.for_rent = true))
    AND (p_price_min IS NULL OR p.price >= p_price_min)
    AND (p_price_max IS NULL OR p.price <= p_price_max)
    AND (p_bedrooms IS NULL OR p.bedrooms >= p_bedrooms)
    AND (p_bathrooms IS NULL OR p.bathrooms >= p_bathrooms)
  ORDER BY 
    CASE WHEN EXISTS(
      SELECT 1 FROM featured_properties fp 
      WHERE fp.property_id = p.id 
        AND fp.status = 'active' 
        AND fp.end_date > NOW()
    ) THEN 0 ELSE 1 END,
    p.created_at DESC
  LIMIT 500;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;