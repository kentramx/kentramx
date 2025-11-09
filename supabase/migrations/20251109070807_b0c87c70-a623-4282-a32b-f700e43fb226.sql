-- Add amenities and video fields to properties table
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS amenities jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS video_url text,
ADD COLUMN IF NOT EXISTS price_history jsonb DEFAULT '[]'::jsonb;

-- Add comment to explain amenities structure
COMMENT ON COLUMN public.properties.amenities IS 'Array of amenity objects with category and items: [{"category": "Interior", "items": ["Cocina equipada", "Closets"]}]';

COMMENT ON COLUMN public.properties.price_history IS 'Array of price changes: [{"price": 5000000, "date": "2024-01-01", "change_type": "reduction"}]';