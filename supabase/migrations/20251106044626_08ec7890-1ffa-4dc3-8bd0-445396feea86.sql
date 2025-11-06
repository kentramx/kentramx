-- Add listing_type column to properties table
ALTER TABLE public.properties 
ADD COLUMN listing_type text NOT NULL DEFAULT 'venta' CHECK (listing_type IN ('venta', 'renta'));

-- Create index for faster filtering
CREATE INDEX idx_properties_listing_type ON public.properties(listing_type);

-- Update existing properties to have listing_type
UPDATE public.properties SET listing_type = 'venta' WHERE listing_type IS NULL;