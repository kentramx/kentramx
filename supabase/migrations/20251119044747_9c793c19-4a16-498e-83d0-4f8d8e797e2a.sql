
-- =====================================================
-- OPTIMIZACIÓN UX: Reducir umbral de clustering de 12 a 11
-- Objetivo: Mostrar marcadores individuales más temprano para mejor UX
-- =====================================================

-- Actualizar función get_map_tiles con nuevo umbral
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
  v_estado text;
  v_municipio text;
  v_listing_type text;
  v_tipo text;
  v_precio_min numeric;
  v_precio_max numeric;
  v_recamaras integer;
  v_banos integer;
  v_status text[];
  v_cluster_zoom integer := 11; -- ✅ CAMBIADO DE 12 A 11
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
  
  -- Status filter: solo propiedades activas
  v_status := ARRAY['activa'];
  
  -- Adjust clustering based on zoom level
  IF p_zoom < 10 THEN
    v_cluster_distance := 0.05;
  ELSIF p_zoom < 11 THEN -- ✅ CAMBIADO DE < 12 A < 11
    v_cluster_distance := 0.02;
  ELSE
    v_cluster_distance := 0.01;
  END IF;

  -- Si zoom >= 11, retornar propiedades individuales (CAMBIADO DE >= 12)
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
      WHERE p.lat IS NOT NULL 
        AND p.lng IS NOT NULL
        AND p.lat BETWEEN p_min_lat AND p_max_lat
        AND p.lng BETWEEN p_min_lng AND p_max_lng
        AND p.status::text = ANY(v_status)
        AND (v_estado IS NULL OR p.state = v_estado)
        AND (v_municipio IS NULL OR p.municipality = v_municipio)
        AND (v_listing_type IS NULL OR p.listing_type = v_listing_type)
        AND (v_tipo IS NULL OR p.type::text = v_tipo)
        AND (v_precio_min IS NULL OR p.price >= v_precio_min)
        AND (v_precio_max IS NULL OR p.price <= v_precio_max)
        AND (v_recamaras IS NULL OR p.bedrooms >= v_recamaras)
        AND (v_banos IS NULL OR p.bathrooms >= v_banos)
      LIMIT 1000
    LOOP
      v_properties := v_properties || jsonb_build_object(
        'id', v_property.id, 'title', v_property.title,
        'price', v_property.price, 'currency', v_property.currency,
        'type', v_property.type, 'listing_type', v_property.listing_type,
        'lat', v_property.lat, 'lng', v_property.lng,
        'bedrooms', v_property.bedrooms, 'bathrooms', v_property.bathrooms,
        'sqft', v_property.sqft, 'municipality', v_property.municipality,
        'state', v_property.state, 'colonia', v_property.colonia,
        'image_url', v_property.image_url
      );
    END LOOP;
    
    RETURN jsonb_build_object(
      'properties', v_properties,
      'clusters', '[]'::jsonb
    );
  END IF;

  -- Para zoom < 11, crear clusters (CAMBIADO DE < 12)
  FOR v_cluster IN
    SELECT 
      COUNT(*)::integer as count,
      AVG(lat)::double precision as lat,
      AVG(lng)::double precision as lng,
      AVG(price)::numeric as avg_price
    FROM properties p
    WHERE p.lat IS NOT NULL 
      AND p.lng IS NOT NULL
      AND p.lat BETWEEN p_min_lat AND p_max_lat
      AND p.lng BETWEEN p_min_lng AND p_max_lng
      AND p.status::text = ANY(v_status)
      AND (v_estado IS NULL OR p.state = v_estado)
      AND (v_municipio IS NULL OR p.municipality = v_municipio)
      AND (v_listing_type IS NULL OR p.listing_type = v_listing_type)
      AND (v_tipo IS NULL OR p.type::text = v_tipo)
      AND (v_precio_min IS NULL OR p.price >= v_precio_min)
      AND (v_precio_max IS NULL OR p.price <= v_precio_max)
      AND (v_recamaras IS NULL OR p.bedrooms >= v_recamaras)
      AND (v_banos IS NULL OR p.bathrooms >= v_banos)
    GROUP BY 
      FLOOR(lat / v_cluster_distance),
      FLOOR(lng / v_cluster_distance)
    HAVING COUNT(*) > 0
  LOOP
    v_clusters := v_clusters || jsonb_build_object(
      'count', v_cluster.count,
      'lat', v_cluster.lat,
      'lng', v_cluster.lng,
      'avg_price', v_cluster.avg_price
    );
  END LOOP;

  RETURN jsonb_build_object(
    'properties', '[]'::jsonb,
    'clusters', v_clusters
  );
END;
$function$;

COMMENT ON FUNCTION public.get_map_tiles IS 'Función principal para obtener datos del mapa. Retorna clusters para zoom <11, propiedades individuales para zoom >=11 (optimizado para mejor UX).';

-- Truncar cache para forzar regeneración con nuevo umbral
TRUNCATE TABLE property_tiles_cache;
