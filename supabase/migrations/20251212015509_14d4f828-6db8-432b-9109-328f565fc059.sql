
-- Corregir función - is_featured viene de featured_properties, images de la tabla images
DROP FUNCTION IF EXISTS get_map_data(double precision, double precision, double precision, double precision, integer, text, text, numeric, numeric, integer, integer, text, text);

CREATE OR REPLACE FUNCTION get_map_data(
  p_north double precision,
  p_south double precision,
  p_east double precision,
  p_west double precision,
  p_zoom integer,
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
STABLE
AS $$
DECLARE
  result json;
  property_count integer;
  grid_size double precision;
  should_cluster boolean;
BEGIN
  grid_size := CASE
    WHEN p_zoom >= 14 THEN 0.001
    WHEN p_zoom >= 12 THEN 0.005
    WHEN p_zoom >= 10 THEN 0.02
    WHEN p_zoom >= 8 THEN 0.1
    WHEN p_zoom >= 6 THEN 0.5
    ELSE 1.0
  END;

  SELECT COUNT(*) INTO property_count
  FROM properties p
  WHERE p.lat IS NOT NULL AND p.lng IS NOT NULL
    AND p.lat BETWEEN p_south AND p_north
    AND p.lng BETWEEN p_west AND p_east
    AND p.status = 'activa'
    AND (p_listing_type IS NULL OR p.listing_type = p_listing_type)
    AND (p_property_type IS NULL OR p.type::TEXT = p_property_type)
    AND (p_price_min IS NULL OR p.price >= p_price_min)
    AND (p_price_max IS NULL OR p.price <= p_price_max)
    AND (p_bedrooms IS NULL OR p.bedrooms >= p_bedrooms)
    AND (p_bathrooms IS NULL OR p.bathrooms >= p_bathrooms)
    AND (p_state IS NULL OR unaccent(LOWER(p.state)) LIKE '%' || unaccent(LOWER(p_state)) || '%')
    AND (p_municipality IS NULL OR unaccent(LOWER(p.municipality)) LIKE '%' || unaccent(LOWER(p_municipality)) || '%');

  should_cluster := p_zoom < 14 AND property_count > 200;

  IF NOT should_cluster THEN
    SELECT json_build_object(
      'properties', COALESCE((
        SELECT json_agg(prop_row)
        FROM (
          SELECT json_build_object(
            'id', p.id, 
            'lat', p.lat, 
            'lng', p.lng, 
            'price', p.price,
            'currency', COALESCE(p.currency, 'MXN'), 
            'type', p.type, 
            'title', p.title,
            'bedrooms', p.bedrooms, 
            'bathrooms', p.bathrooms, 
            'sqft', p.sqft,
            'parking', p.parking, 
            'listing_type', p.listing_type, 
            'address', p.address,
            'colonia', p.colonia, 
            'state', p.state, 
            'municipality', p.municipality,
            'agent_id', p.agent_id,
            'created_at', p.created_at,
            'for_sale', p.for_sale,
            'for_rent', p.for_rent,
            'sale_price', p.sale_price,
            'rent_price', p.rent_price,
            'is_featured', EXISTS(
              SELECT 1 FROM featured_properties fp 
              WHERE fp.property_id = p.id 
                AND fp.status = 'active' 
                AND fp.end_date > NOW()
            ),
            'images', COALESCE((
              SELECT json_agg(json_build_object('url', i.url) ORDER BY i.position)
              FROM images i WHERE i.property_id = p.id
            ), '[]'::json)
          ) as prop_row
          FROM properties p
          WHERE p.lat IS NOT NULL AND p.lng IS NOT NULL
            AND p.lat BETWEEN p_south AND p_north
            AND p.lng BETWEEN p_west AND p_east
            AND p.status = 'activa'
            AND (p_listing_type IS NULL OR p.listing_type = p_listing_type)
            AND (p_property_type IS NULL OR p.type::TEXT = p_property_type)
            AND (p_price_min IS NULL OR p.price >= p_price_min)
            AND (p_price_max IS NULL OR p.price <= p_price_max)
            AND (p_bedrooms IS NULL OR p.bedrooms >= p_bedrooms)
            AND (p_bathrooms IS NULL OR p.bathrooms >= p_bathrooms)
            AND (p_state IS NULL OR unaccent(LOWER(p.state)) LIKE '%' || unaccent(LOWER(p_state)) || '%')
            AND (p_municipality IS NULL OR unaccent(LOWER(p.municipality)) LIKE '%' || unaccent(LOWER(p_municipality)) || '%')
          ORDER BY 
            EXISTS(SELECT 1 FROM featured_properties fp WHERE fp.property_id = p.id AND fp.status = 'active' AND fp.end_date > NOW()) DESC,
            p.created_at DESC
          LIMIT 200
        ) sub
      ), '[]'::json),
      'clusters', '[]'::json,
      'total_count', property_count,
      'is_clustered', false
    ) INTO result;
  ELSE
    SELECT json_build_object(
      'properties', COALESCE((
        SELECT json_agg(prop_row)
        FROM (
          SELECT json_build_object(
            'id', p.id, 
            'lat', p.lat, 
            'lng', p.lng, 
            'price', p.price,
            'currency', COALESCE(p.currency, 'MXN'), 
            'type', p.type, 
            'title', p.title,
            'bedrooms', p.bedrooms, 
            'bathrooms', p.bathrooms, 
            'sqft', p.sqft,
            'parking', p.parking, 
            'listing_type', p.listing_type, 
            'address', p.address,
            'colonia', p.colonia, 
            'state', p.state, 
            'municipality', p.municipality,
            'agent_id', p.agent_id,
            'created_at', p.created_at,
            'for_sale', p.for_sale,
            'for_rent', p.for_rent,
            'sale_price', p.sale_price,
            'rent_price', p.rent_price,
            'is_featured', EXISTS(
              SELECT 1 FROM featured_properties fp 
              WHERE fp.property_id = p.id 
                AND fp.status = 'active' 
                AND fp.end_date > NOW()
            ),
            'images', COALESCE((
              SELECT json_agg(json_build_object('url', i.url) ORDER BY i.position)
              FROM images i WHERE i.property_id = p.id
            ), '[]'::json)
          ) as prop_row
          FROM properties p
          WHERE p.lat IS NOT NULL AND p.lng IS NOT NULL
            AND p.lat BETWEEN p_south AND p_north
            AND p.lng BETWEEN p_west AND p_east
            AND p.status = 'activa'
            AND (p_listing_type IS NULL OR p.listing_type = p_listing_type)
            AND (p_property_type IS NULL OR p.type::TEXT = p_property_type)
            AND (p_price_min IS NULL OR p.price >= p_price_min)
            AND (p_price_max IS NULL OR p.price <= p_price_max)
            AND (p_bedrooms IS NULL OR p.bedrooms >= p_bedrooms)
            AND (p_bathrooms IS NULL OR p.bathrooms >= p_bathrooms)
            AND (p_state IS NULL OR unaccent(LOWER(p.state)) LIKE '%' || unaccent(LOWER(p_state)) || '%')
            AND (p_municipality IS NULL OR unaccent(LOWER(p.municipality)) LIKE '%' || unaccent(LOWER(p_municipality)) || '%')
          ORDER BY 
            EXISTS(SELECT 1 FROM featured_properties fp WHERE fp.property_id = p.id AND fp.status = 'active' AND fp.end_date > NOW()) DESC,
            p.created_at DESC
          LIMIT 50
        ) sub
      ), '[]'::json),
      'clusters', COALESCE((
        SELECT json_agg(json_build_object(
          'lat', cluster_lat,
          'lng', cluster_lng,
          'count', cluster_count,
          'expansion_zoom', LEAST(p_zoom + 2, 14)
        ))
        FROM (
          SELECT 
            ROUND(p.lat / grid_size) * grid_size + grid_size / 2 as cluster_lat,
            ROUND(p.lng / grid_size) * grid_size + grid_size / 2 as cluster_lng,
            COUNT(*) as cluster_count
          FROM properties p
          WHERE p.lat IS NOT NULL AND p.lng IS NOT NULL
            AND p.lat BETWEEN p_south AND p_north
            AND p.lng BETWEEN p_west AND p_east
            AND p.status = 'activa'
            AND (p_listing_type IS NULL OR p.listing_type = p_listing_type)
            AND (p_property_type IS NULL OR p.type::TEXT = p_property_type)
            AND (p_price_min IS NULL OR p.price >= p_price_min)
            AND (p_price_max IS NULL OR p.price <= p_price_max)
            AND (p_bedrooms IS NULL OR p.bedrooms >= p_bedrooms)
            AND (p_bathrooms IS NULL OR p.bathrooms >= p_bathrooms)
            AND (p_state IS NULL OR unaccent(LOWER(p.state)) LIKE '%' || unaccent(LOWER(p_state)) || '%')
            AND (p_municipality IS NULL OR unaccent(LOWER(p.municipality)) LIKE '%' || unaccent(LOWER(p_municipality)) || '%')
          GROUP BY ROUND(p.lat / grid_size), ROUND(p.lng / grid_size)
          HAVING COUNT(*) > 0
          ORDER BY COUNT(*) DESC
          LIMIT 200
        ) clusters
      ), '[]'::json),
      'total_count', property_count,
      'is_clustered', true
    ) INTO result;
  END IF;

  RETURN result;
END;
$$;
