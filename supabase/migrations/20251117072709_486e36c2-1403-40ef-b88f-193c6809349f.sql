-- FASE 1: Tile-Based Architecture para escalabilidad infinita

-- 1. Tabla de materialización de tiles (cache de resultados pre-calculados)
CREATE TABLE IF NOT EXISTS property_tiles (
  tile_key TEXT PRIMARY KEY,
  zoom INTEGER NOT NULL,
  x_tile INTEGER NOT NULL,
  y_tile INTEGER NOT NULL,
  bounds GEOMETRY(POLYGON, 4326),
  property_count INTEGER DEFAULT 0,
  cluster_data JSONB,
  property_ids UUID[],
  avg_price NUMERIC,
  last_updated TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tile_zoom ON property_tiles(zoom);
CREATE INDEX IF NOT EXISTS idx_tile_bounds ON property_tiles USING GIST(bounds);
CREATE INDEX IF NOT EXISTS idx_tile_coords ON property_tiles(zoom, x_tile, y_tile);
CREATE INDEX IF NOT EXISTS idx_tile_updated ON property_tiles(last_updated);

-- 2. Funciones auxiliares para conversión de coordenadas a tiles (Slippy Map Tilenames)
CREATE OR REPLACE FUNCTION lng_to_tile_x(lng NUMERIC, zoom INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN FLOOR((lng + 180.0) / 360.0 * POW(2, zoom))::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION lat_to_tile_y(lat NUMERIC, zoom INTEGER)
RETURNS INTEGER AS $$
DECLARE
  lat_rad NUMERIC;
BEGIN
  lat_rad := lat * PI() / 180.0;
  RETURN FLOOR((1.0 - LN(TAN(lat_rad) + 1.0 / COS(lat_rad)) / PI()) / 2.0 * POW(2, zoom))::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Función principal get_map_tiles() para arquitectura tile-based
CREATE OR REPLACE FUNCTION get_map_tiles(
  p_min_lng NUMERIC,
  p_min_lat NUMERIC,
  p_max_lng NUMERIC,
  p_max_lat NUMERIC,
  p_zoom INTEGER,
  p_filters JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE(
  tile_key TEXT,
  zoom INTEGER,
  clusters JSONB,
  properties JSONB
) AS $$
DECLARE
  v_grid_size NUMERIC;
  v_state TEXT;
  v_municipality TEXT;
  v_listing_type TEXT;
  v_property_type TEXT;
  v_min_price NUMERIC;
  v_max_price NUMERIC;
  v_min_bedrooms INTEGER;
  v_min_bathrooms INTEGER;
BEGIN
  -- Extraer filtros del JSONB
  v_state := p_filters->>'state';
  v_municipality := p_filters->>'municipality';
  v_listing_type := p_filters->>'listingType';
  v_property_type := p_filters->>'propertyType';
  v_min_price := (p_filters->>'minPrice')::NUMERIC;
  v_max_price := (p_filters->>'maxPrice')::NUMERIC;
  v_min_bedrooms := (p_filters->>'minBedrooms')::INTEGER;
  v_min_bathrooms := (p_filters->>'minBathrooms')::INTEGER;

  -- Determinar tamaño de grid según zoom (clustering adaptativo)
  v_grid_size := CASE
    WHEN p_zoom <= 8 THEN 0.5      -- Zoom muy bajo: clusters grandes
    WHEN p_zoom <= 10 THEN 0.2     -- Zoom bajo: clusters medianos
    WHEN p_zoom <= 12 THEN 0.05    -- Zoom medio-bajo: clusters pequeños
    WHEN p_zoom <= 14 THEN 0.02    -- Zoom medio: clusters más finos
    WHEN p_zoom <= 15 THEN 0.01    -- Zoom medio-alto: clusters muy finos
    WHEN p_zoom <= 16 THEN 0.005   -- Zoom alto: casi individuales
    ELSE 0.001                      -- Zoom muy alto: individuales
  END;

  -- Para zoom 17+: retornar propiedades individuales sin clustering
  IF p_zoom >= 17 THEN
    RETURN QUERY
    SELECT
      'individual'::TEXT as tile_key,
      p_zoom as zoom,
      NULL::JSONB as clusters,
      jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'title', p.title,
          'price', p.price,
          'lat', p.lat,
          'lng', p.lng,
          'type', p.type,
          'listing_type', p.listing_type,
          'bedrooms', p.bedrooms,
          'bathrooms', p.bathrooms,
          'municipality', p.municipality,
          'state', p.state,
          'image_url', (
            SELECT url FROM images 
            WHERE property_id = p.id 
            ORDER BY position 
            LIMIT 1
          ),
          'is_featured', EXISTS(
            SELECT 1 FROM featured_properties fp
            WHERE fp.property_id = p.id
              AND fp.status = 'active'
              AND fp.end_date > now()
          )
        )
      ) as properties
    FROM properties p
    WHERE p.status = 'aprobada'
      AND p.lat IS NOT NULL
      AND p.lng IS NOT NULL
      AND p.lat BETWEEN p_min_lat AND p_max_lat
      AND p.lng BETWEEN p_min_lng AND p_max_lng
      AND (v_state IS NULL OR p.state = v_state)
      AND (v_municipality IS NULL OR p.municipality = v_municipality)
      AND (v_listing_type IS NULL OR p.listing_type = v_listing_type)
      AND (v_property_type IS NULL OR p.type::TEXT = v_property_type)
      AND (v_min_price IS NULL OR p.price >= v_min_price)
      AND (v_max_price IS NULL OR p.price <= v_max_price)
      AND (v_min_bedrooms IS NULL OR p.bedrooms >= v_min_bedrooms)
      AND (v_min_bathrooms IS NULL OR p.bathrooms >= v_min_bathrooms);
  ELSE
    -- Para zoom <17: retornar clusters dinámicos grid-based
    RETURN QUERY
    SELECT
      'clustered'::TEXT as tile_key,
      p_zoom as zoom,
      jsonb_agg(
        jsonb_build_object(
          'lat', cluster_lat,
          'lng', cluster_lng,
          'count', property_count,
          'avg_price', avg_price,
          'property_ids', property_ids
        )
      ) as clusters,
      NULL::JSONB as properties
    FROM (
      SELECT
        ROUND(AVG(p.lat)::NUMERIC, 6) as cluster_lat,
        ROUND(AVG(p.lng)::NUMERIC, 6) as cluster_lng,
        COUNT(*)::INTEGER as property_count,
        ROUND(AVG(p.price)::NUMERIC, 2) as avg_price,
        array_agg(p.id) as property_ids
      FROM properties p
      WHERE p.status = 'aprobada'
        AND p.lat IS NOT NULL
        AND p.lng IS NOT NULL
        AND p.lat BETWEEN p_min_lat AND p_max_lat
        AND p.lng BETWEEN p_min_lng AND p_max_lng
        AND (v_state IS NULL OR p.state = v_state)
        AND (v_municipality IS NULL OR p.municipality = v_municipality)
        AND (v_listing_type IS NULL OR p.listing_type = v_listing_type)
        AND (v_property_type IS NULL OR p.type::TEXT = v_property_type)
        AND (v_min_price IS NULL OR p.price >= v_min_price)
        AND (v_max_price IS NULL OR p.price <= v_max_price)
        AND (v_min_bedrooms IS NULL OR p.bedrooms >= v_min_bedrooms)
        AND (v_min_bathrooms IS NULL OR p.bathrooms >= v_min_bathrooms)
      GROUP BY
        FLOOR(p.lat / v_grid_size),
        FLOOR(p.lng / v_grid_size)
      HAVING COUNT(*) > 0
    ) clusters;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Función para invalidar cache de tiles afectados por cambio de propiedad
CREATE OR REPLACE FUNCTION invalidate_affected_tiles(p_property_id UUID)
RETURNS VOID AS $$
DECLARE
  v_lat NUMERIC;
  v_lng NUMERIC;
  v_zoom INTEGER;
  v_x INTEGER;
  v_y INTEGER;
  v_tile_key TEXT;
BEGIN
  -- Obtener coordenadas de la propiedad
  SELECT lat, lng INTO v_lat, v_lng
  FROM properties
  WHERE id = p_property_id;

  -- Si no tiene coordenadas, no hay tiles que invalidar
  IF v_lat IS NULL OR v_lng IS NULL THEN
    RETURN;
  END IF;

  -- Invalidar tiles para todos los niveles de zoom (5-16)
  FOR v_zoom IN 5..16 LOOP
    v_x := lng_to_tile_x(v_lng, v_zoom);
    v_y := lat_to_tile_y(v_lat, v_zoom);
    v_tile_key := 'z' || v_zoom || '_x' || v_x || '_y' || v_y;

    -- Eliminar tile de cache para forzar recalculo
    DELETE FROM property_tiles WHERE tile_key = v_tile_key;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger automático para invalidar cache cuando cambian propiedades
CREATE OR REPLACE FUNCTION trigger_invalidate_tiles()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM invalidate_affected_tiles(OLD.id);
  ELSIF TG_OP = 'UPDATE' THEN
    -- Solo invalidar si cambiaron coordenadas o status
    IF (OLD.lat IS DISTINCT FROM NEW.lat) OR 
       (OLD.lng IS DISTINCT FROM NEW.lng) OR 
       (OLD.status IS DISTINCT FROM NEW.status) THEN
      PERFORM invalidate_affected_tiles(OLD.id);
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM invalidate_affected_tiles(NEW.id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS properties_tiles_invalidation ON properties;
CREATE TRIGGER properties_tiles_invalidation
AFTER INSERT OR UPDATE OR DELETE ON properties
FOR EACH ROW
EXECUTE FUNCTION trigger_invalidate_tiles();

-- 6. Función para limpiar tiles viejos del cache (ejecutar diariamente via cron)
CREATE OR REPLACE FUNCTION cleanup_old_tiles(p_days_old INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM property_tiles
  WHERE last_updated < now() - (p_days_old || ' days')::INTERVAL;
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios de documentación
COMMENT ON TABLE property_tiles IS 'Cache de tiles pre-calculados para arquitectura tile-based de mapas. Soporta escalabilidad infinita.';
COMMENT ON FUNCTION get_map_tiles IS 'Función principal para obtener datos del mapa usando arquitectura tile-based. Retorna clusters para zoom <17, propiedades individuales para zoom >=17.';
COMMENT ON FUNCTION invalidate_affected_tiles IS 'Invalida tiles de cache afectados por cambios en una propiedad específica.';
COMMENT ON FUNCTION cleanup_old_tiles IS 'Limpia tiles obsoletos del cache. Ejecutar diariamente via cron job.';