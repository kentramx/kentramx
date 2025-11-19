-- ✅ Sincronizar umbral de clustering a Zoom 10 en backend
-- Este cambio hace que el backend devuelva properties individuales a partir de zoom >= 10

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
STABLE
AS $$
DECLARE
  v_estado text;
  v_municipio text;
  v_listing_type text;
  v_tipo text;
  v_precio_min numeric;
  v_precio_max numeric;
  v_recamaras integer;
  v_banos integer;
  v_status text[];
  v_cluster_zoom integer := 10; -- ✅ CAMBIADO DE 11 A 10
  v_cluster_distance numeric := 0.01;
  v_properties jsonb := '[]'::jsonb;
  v_clusters jsonb := '[]'::jsonb;
  v_result jsonb;
  v_property record;
  v_cluster record;
BEGIN
  -- Extract filters from JSONB
  v_estado := p_filters->>'estado';
  v_municipio := p_filters->>'municipio';
  v_listing_type := p_filters->>'listingType';
  v_tipo := p_filters->>'tipo';
  v_precio_min := (p_filters->>'precioMin')::numeric;
  v_precio_max := (p_filters->>'precioMax')::numeric;
  v_recamaras := (p_filters->>'recamaras')::integer;
  v_banos := (p_filters->>'banos')::integer;
  v_status := COALESCE((p_filters->>'status')::text[], ARRAY['activa']);

  -- Ajustar cluster distance según zoom
  IF p_zoom < 10 THEN
    v_cluster_distance := 0.05;
  ELSIF p_zoom < 10 THEN -- ✅ CAMBIADO DE < 11 A < 10
    v_cluster_distance := 0.02;
  ELSE
    v_cluster_distance := 0.01;
  END IF;

  -- Si zoom >= 10, retornar propiedades individuales (CAMBIADO DE >= 11)
  IF p_zoom >= v_cluster_zoom THEN
    FOR v_property IN
      SELECT 
        p.id, p.title, p.price, p.currency, p.type, p.listing_type,
        p.lat, p.lng, p.bedrooms, p.bathrooms, p.sqft,
        p.municipality, p.state, p.colonia,
        COALESCE(
          (SELECT url FROM images WHERE property_id = p.id ORDER BY position LIMIT 1),
          '/placeholder.svg'
        ) as image_url
      FROM properties p
      WHERE p.status = ANY(v_status)
        AND p.lat IS NOT NULL 
        AND p.lng IS NOT NULL
        AND p.lat BETWEEN p_min_lat AND p_max_lat
        AND p.lng BETWEEN p_min_lng AND p_max_lng
        AND (v_estado IS NULL OR p.state = v_estado)
        AND (v_municipio IS NULL OR p.municipality = v_municipio)
        AND (v_listing_type IS NULL OR 
          (v_listing_type = 'venta' AND p.for_sale = true) OR
          (v_listing_type = 'renta' AND p.for_rent = true))
        AND (v_tipo IS NULL OR p.type::text = v_tipo)
        AND (v_precio_min IS NULL OR p.price >= v_precio_min)
        AND (v_precio_max IS NULL OR p.price <= v_precio_max)
        AND (v_recamaras IS NULL OR p.bedrooms >= v_recamaras)
        AND (v_banos IS NULL OR p.bathrooms >= v_banos)
      ORDER BY p.created_at DESC
      LIMIT 1000
    LOOP
      v_properties := v_properties || jsonb_build_object(
        'id', v_property.id,
        'title', v_property.title,
        'price', v_property.price,
        'currency', v_property.currency,
        'type', v_property.type,
        'listing_type', v_property.listing_type,
        'lat', v_property.lat,
        'lng', v_property.lng,
        'bedrooms', v_property.bedrooms,
        'bathrooms', v_property.bathrooms,
        'sqft', v_property.sqft,
        'municipality', v_property.municipality,
        'state', v_property.state,
        'colonia', v_property.colonia,
        'image_url', v_property.image_url
      );
    END LOOP;

    RETURN jsonb_build_object('properties', v_properties, 'clusters', v_clusters);
  END IF;

  -- Para zoom < 10, crear clusters
  FOR v_cluster IN
    WITH clustered_properties AS (
      SELECT 
        COUNT(*)::integer as property_count,
        AVG(p.lat)::double precision as lat,
        AVG(p.lng)::double precision as lng,
        MIN(p.price)::numeric as min_price,
        MAX(p.price)::numeric as max_price,
        AVG(p.price)::numeric as avg_price,
        MODE() WITHIN GROUP (ORDER BY p.currency) as currency,
        ST_ClusterKMeans(
          ST_SetSRID(ST_MakePoint(p.lng, p.lat), 4326),
          GREATEST(1, (COUNT(*) OVER () / 50)::integer)
        ) OVER () as cluster_id
      FROM properties p
      WHERE p.status = ANY(v_status)
        AND p.lat IS NOT NULL 
        AND p.lng IS NOT NULL
        AND p.lat BETWEEN p_min_lat AND p_max_lat
        AND p.lng BETWEEN p_min_lng AND p_max_lng
        AND (v_estado IS NULL OR p.state = v_estado)
        AND (v_municipio IS NULL OR p.municipality = v_municipio)
        AND (v_listing_type IS NULL OR 
          (v_listing_type = 'venta' AND p.for_sale = true) OR
          (v_listing_type = 'renta' AND p.for_rent = true))
        AND (v_tipo IS NULL OR p.type::text = v_tipo)
        AND (v_precio_min IS NULL OR p.price >= v_precio_min)
        AND (v_precio_max IS NULL OR p.price <= v_precio_max)
        AND (v_recamaras IS NULL OR p.bedrooms >= v_recamaras)
        AND (v_banos IS NULL OR p.bathrooms >= v_banos)
    )
    SELECT 
      property_count,
      lat,
      lng,
      min_price,
      max_price,
      avg_price,
      currency,
      cluster_id
    FROM clustered_properties
    GROUP BY cluster_id, property_count, lat, lng, min_price, max_price, avg_price, currency
    ORDER BY property_count DESC
  LOOP
    v_clusters := v_clusters || jsonb_build_object(
      'id', 'cluster-' || v_cluster.cluster_id::text,
      'lat', v_cluster.lat,
      'lng', v_cluster.lng,
      'property_count', v_cluster.property_count,
      'min_price', v_cluster.min_price,
      'max_price', v_cluster.max_price,
      'avg_price', v_cluster.avg_price,
      'currency', v_cluster.currency
    );
  END LOOP;

  v_result := jsonb_build_object(
    'properties', v_properties,
    'clusters', v_clusters
  );

  RETURN v_result;
END;
$$;