-- Eliminar tablas de cache de tiles de mapas
DROP TABLE IF EXISTS public.property_tiles_cache CASCADE;
DROP TABLE IF EXISTS public.property_tiles CASCADE;

-- Eliminar trigger de invalidación de tiles
DROP TRIGGER IF EXISTS on_property_change_invalidate_tiles ON public.properties;

-- Eliminar funciones RPC relacionadas con mapas/tiles/viewport (con firmas específicas)
DROP FUNCTION IF EXISTS public.get_map_tiles(double precision, double precision, double precision, double precision, integer, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.get_map_tiles_cached(numeric, numeric, numeric, numeric, integer, jsonb) CASCADE;

DROP FUNCTION IF EXISTS public.get_properties_in_viewport(double precision, double precision, double precision, double precision, text, text, text, text, text, numeric, numeric, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_properties_in_viewport(numeric, numeric, numeric, numeric, text, text, text, property_type, text, numeric, numeric, integer, integer, integer) CASCADE;

DROP FUNCTION IF EXISTS public.get_property_clusters(double precision, double precision, double precision, double precision, integer, text, text, text, text, text, numeric, numeric, integer, integer) CASCADE;

DROP FUNCTION IF EXISTS public.cleanup_expired_tiles() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_old_tiles(integer) CASCADE;
DROP FUNCTION IF EXISTS public.invalidate_affected_tiles(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.invalidate_tiles_cache() CASCADE;
DROP FUNCTION IF EXISTS public.trigger_invalidate_tiles() CASCADE;
DROP FUNCTION IF EXISTS public.lat_to_tile_y(numeric, integer) CASCADE;
DROP FUNCTION IF EXISTS public.lng_to_tile_x(numeric, integer) CASCADE;