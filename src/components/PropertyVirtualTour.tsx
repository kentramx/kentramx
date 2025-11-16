import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, Play } from "lucide-react";
import { useState } from "react";

interface PropertyVirtualTourProps {
  videoUrl?: string;
  title: string;
}

export const PropertyVirtualTour = ({ videoUrl, title }: PropertyVirtualTourProps) => {
  const [isPlaying, setIsPlaying] = useState(false);

  if (!videoUrl) {
    return null;
  }

  // Extract video ID from YouTube/Vimeo URLs
  const getEmbedUrl = (url: string) => {
    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('youtu.be')
        ? url.split('youtu.be/')[1]?.split('?')[0]
        : url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }
    
    // Vimeo
    if (url.includes('vimeo.com')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
      return `https://player.vimeo.com/video/${videoId}?autoplay=1`;
    }

    return url;
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5 text-primary" />
          Tour Virtual
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-muted">
          {!isPlaying ? (
            <button
              onClick={() => setIsPlaying(true)}
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60 hover:bg-black/50 transition-colors group cursor-pointer"
            >
              <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="h-10 w-10 text-primary-foreground ml-1" />
              </div>
              <p className="text-white text-lg font-semibold">Ver Tour Virtual</p>
            </button>
          ) : (
            <iframe
              src={getEmbedUrl(videoUrl)}
              title={`Tour Virtual - ${title}`}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};
