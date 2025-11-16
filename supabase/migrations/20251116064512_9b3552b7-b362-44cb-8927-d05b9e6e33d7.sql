-- Eliminar y recrear función con tipos correctos
DROP FUNCTION IF EXISTS get_properties_in_viewport(
  double precision, double precision, double precision, double precision,
  text, text, text, text, text, numeric, numeric, integer, integer
);

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
  lat double precision,
  lng double precision,
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
    ST_Y(p.geom)::double precision as lat,
    ST_X(p.geom)::double precision as lng,
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