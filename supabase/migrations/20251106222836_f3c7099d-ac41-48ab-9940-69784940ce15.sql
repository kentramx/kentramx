-- Create agent reviews table
CREATE TABLE public.agent_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(buyer_id, agent_id, property_id)
);

-- Enable Row Level Security
ALTER TABLE public.agent_reviews ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Reviews are viewable by everyone" 
ON public.agent_reviews 
FOR SELECT 
USING (true);

CREATE POLICY "Buyers can create reviews" 
ON public.agent_reviews 
FOR INSERT 
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Buyers can update own reviews" 
ON public.agent_reviews 
FOR UPDATE 
USING (auth.uid() = buyer_id);

CREATE POLICY "Buyers can delete own reviews" 
ON public.agent_reviews 
FOR DELETE 
USING (auth.uid() = buyer_id);

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_agent_reviews_updated_at
BEFORE UPDATE ON public.agent_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Create index for faster queries
CREATE INDEX idx_agent_reviews_agent_id ON public.agent_reviews(agent_id);
CREATE INDEX idx_agent_reviews_buyer_id ON public.agent_reviews(buyer_id);
CREATE INDEX idx_agent_reviews_property_id ON public.agent_reviews(property_id);