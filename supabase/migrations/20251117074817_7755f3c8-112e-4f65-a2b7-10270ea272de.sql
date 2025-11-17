-- Fix get_map_tiles function to use correct enum value 'activa' instead of 'aprobada'
CREATE OR REPLACE FUNCTION public.get_map_tiles(
  p_min_lat DECIMAL,
  p_max_lat DECIMAL,
  p_min_lng DECIMAL,
  p_max_lng DECIMAL,
  p_zoom INTEGER,
  p_property_type TEXT DEFAULT NULL,
  p_listing_type TEXT DEFAULT NULL,
  p_min_price DECIMAL DEFAULT NULL,
  p_max_price DECIMAL DEFAULT NULL,
  p_bedrooms INTEGER DEFAULT NULL,
  p_bathrooms INTEGER DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_municipality TEXT DEFAULT NULL
)
RETURNS TABLE(
  type TEXT,
  id TEXT,
  lat DECIMAL,
  lng DECIMAL,
  count INTEGER,
  avg_price DECIMAL,
  min_price DECIMAL,
  max_price DECIMAL,
  title TEXT,
  price DECIMAL,
  property_type TEXT,
  bedrooms INTEGER,
  bathrooms INTEGER,
  image_url TEXT,
  municipality TEXT,
  state TEXT,
  listing_type TEXT,
  parking INTEGER,
  sqft DECIMAL,
  agent_id UUID,
  status property_status,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  grid_size DECIMAL;
BEGIN
  -- Adaptive grid size based on zoom
  grid_size := CASE 
    WHEN p_zoom >= 17 THEN 0.001  -- ~100m
    WHEN p_zoom >= 15 THEN 0.005  -- ~500m
    WHEN p_zoom >= 13 THEN 0.01   -- ~1km
    WHEN p_zoom >= 11 THEN 0.05   -- ~5km
    WHEN p_zoom >= 9 THEN 0.1     -- ~10km
    WHEN p_zoom >= 7 THEN 0.2     -- ~20km
    ELSE 0.5                      -- ~50km
  END;

  -- For high zoom levels (17+), return individual properties
  IF p_zoom >= 17 THEN
    RETURN QUERY
    SELECT 
      'property'::TEXT as type,
      p.id::TEXT,
      p.lat,
      p.lng,
      1 as count,
      p.price as avg_price,
      p.price as min_price,
      p.price as max_price,
      p.title,
      p.price,
      p.type::TEXT as property_type,
      p.bedrooms,
      p.bathrooms,
      (SELECT i.url FROM images i WHERE i.property_id = p.id ORDER BY i.position LIMIT 1) as image_url,
      p.municipality,
      p.state,
      p.listing_type,
      p.parking,
      p.sqft,
      p.agent_id,
      p.status,
      p.created_at
    FROM properties p
    WHERE p.lat IS NOT NULL 
      AND p.lng IS NOT NULL
      AND p.status = 'activa'
      AND p.lat BETWEEN p_min_lat AND p_max_lat
      AND p.lng BETWEEN p_min_lng AND p_max_lng
      AND (p_property_type IS NULL OR p.type::TEXT = p_property_type)
      AND (p_listing_type IS NULL OR p.listing_type = p_listing_type)
      AND (p_min_price IS NULL OR p.price >= p_min_price)
      AND (p_max_price IS NULL OR p.price <= p_max_price)
      AND (p_bedrooms IS NULL OR p.bedrooms >= p_bedrooms)
      AND (p_bathrooms IS NULL OR p.bathrooms >= p_bathrooms)
      AND (p_state IS NULL OR p.state = p_state)
      AND (p_municipality IS NULL OR p.municipality = p_municipality)
    ORDER BY p.created_at DESC
    LIMIT 200;
  
  -- For lower zoom levels, return clusters
  ELSE
    RETURN QUERY
    SELECT 
      'cluster'::TEXT as type,
      MD5(CONCAT(
        FLOOR(p.lat / grid_size)::TEXT, 
        '_', 
        FLOOR(p.lng / grid_size)::TEXT
      ))::TEXT as id,
      ROUND(AVG(p.lat)::NUMERIC, 6) as lat,
      ROUND(AVG(p.lng)::NUMERIC, 6) as lng,
      COUNT(*)::INTEGER as count,
      ROUND(AVG(p.price)::NUMERIC, 2) as avg_price,
      MIN(p.price) as min_price,
      MAX(p.price) as max_price,
      NULL::TEXT as title,
      NULL::DECIMAL as price,
      NULL::TEXT as property_type,
      NULL::INTEGER as bedrooms,
      NULL::INTEGER as bathrooms,
      NULL::TEXT as image_url,
      NULL::TEXT as municipality,
      NULL::TEXT as state,
      NULL::TEXT as listing_type,
      NULL::INTEGER as parking,
      NULL::DECIMAL as sqft,
      NULL::UUID as agent_id,
      NULL::property_status as status,
      NULL::TIMESTAMPTZ as created_at
    FROM properties p
    WHERE p.lat IS NOT NULL 
      AND p.lng IS NOT NULL
      AND p.status = 'activa'
      AND p.lat BETWEEN p_min_lat AND p_max_lat
      AND p.lng BETWEEN p_min_lng AND p_max_lng
      AND (p_property_type IS NULL OR p.type::TEXT = p_property_type)
      AND (p_listing_type IS NULL OR p.listing_type = p_listing_type)
      AND (p_min_price IS NULL OR p.price >= p_min_price)
      AND (p_max_price IS NULL OR p.price <= p_max_price)
      AND (p_bedrooms IS NULL OR p.bedrooms >= p_bedrooms)
      AND (p_bathrooms IS NULL OR p.bathrooms >= p_bathrooms)
      AND (p_state IS NULL OR p.state = p_state)
      AND (p_municipality IS NULL OR p.municipality = p_municipality)
    GROUP BY 
      FLOOR(p.lat / grid_size),
      FLOOR(p.lng / grid_size);
  END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;