import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageLightboxProps {
  images: { url: string }[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export const ImageLightbox = ({ images, initialIndex, isOpen, onClose, title }: ImageLightboxProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  
  // Estados para pinch-to-zoom y pan
  const [isPinching, setIsPinching] = useState(false);
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [initialZoom, setInitialZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Resetear zoom, swipe y pan cuando cambia la imagen
  useEffect(() => {
    setZoom(1);
    setSwipeOffset(0);
    setPanOffset({ x: 0, y: 0 });
  }, [currentIndex]);

  // Sincronizar el índice cuando cambia desde fuera
  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  // Navegación con teclado
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, images.length]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
    setPanOffset({ x: 0, y: 0 }); // Reset pan al cambiar zoom manual
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom - 0.25, 0.5);
    setZoom(newZoom);
    if (newZoom === 1) {
      setPanOffset({ x: 0, y: 0 }); // Reset pan cuando volvemos a zoom 1
    }
  };

  // Función para calcular distancia entre dos puntos táctiles
  const getDistance = (touch1: React.Touch, touch2: React.Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Función para obtener el punto medio entre dos touches
  const getMidpoint = (touch1: React.Touch, touch2: React.Touch) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  };

  // Manejo de gestos táctiles
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    // Dos dedos = pinch-to-zoom
    if (e.touches.length === 2) {
      e.preventDefault();
      setIsPinching(true);
      const distance = getDistance(e.touches[0], e.touches[1]);
      setInitialPinchDistance(distance);
      setInitialZoom(zoom);
      return;
    }

    // Un dedo
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      
      // Si hay zoom, activar pan
      if (zoom > 1) {
        setIsPanning(true);
        setPanStart({ x: touch.clientX, y: touch.clientY });
      } else {
        // Si no hay zoom, activar swipe para cambiar imagen
        setTouchEnd(null);
        setTouchStart(touch.clientX);
      }
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    // Manejo de pinch-to-zoom
    if (isPinching && e.touches.length === 2 && initialPinchDistance) {
      e.preventDefault();
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const scale = currentDistance / initialPinchDistance;
      const newZoom = Math.max(0.5, Math.min(3, initialZoom * scale));
      setZoom(newZoom);
      
      // Si zoom vuelve a 1, resetear pan
      if (newZoom <= 1.05) {
        setPanOffset({ x: 0, y: 0 });
      }
      return;
    }

    // Manejo de pan cuando hay zoom
    if (isPanning && e.touches.length === 1 && zoom > 1) {
      e.preventDefault();
      const touch = e.touches[0];
      const deltaX = touch.clientX - panStart.x;
      const deltaY = touch.clientY - panStart.y;
      
      // Limitar el pan basado en el nivel de zoom
      const maxPan = 200 * zoom;
      const limitedX = Math.max(-maxPan, Math.min(maxPan, panOffset.x + deltaX));
      const limitedY = Math.max(-maxPan, Math.min(maxPan, panOffset.y + deltaY));
      
      setPanOffset({ x: limitedX, y: limitedY });
      setPanStart({ x: touch.clientX, y: touch.clientY });
      return;
    }

    // Manejo de swipe para cambiar imagen (solo si zoom = 1)
    if (!isPinching && !isPanning && touchStart && e.touches.length === 1) {
      const currentTouch = e.touches[0].clientX;
      setTouchEnd(currentTouch);
      
      // Calcular offset para feedback visual
      const distance = currentTouch - touchStart;
      const maxOffset = 100;
      const limitedOffset = Math.max(-maxOffset, Math.min(maxOffset, distance / 3));
      setSwipeOffset(limitedOffset);
    }
  };

  const onTouchEnd = () => {
    // Terminar pinch
    if (isPinching) {
      setIsPinching(false);
      setInitialPinchDistance(null);
      return;
    }

    // Terminar pan
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    // Manejo de swipe para cambiar imagen
    if (!touchStart || !touchEnd) {
      setSwipeOffset(0);
      return;
    }

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && images.length > 1 && zoom === 1) {
      handleNext();
    } else if (isRightSwipe && images.length > 1 && zoom === 1) {
      handlePrevious();
    }

    // Resetear valores
    setTouchStart(null);
    setTouchEnd(null);
    setSwipeOffset(0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-black/95 border-0">
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Botón cerrar */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 z-50 bg-background/10 hover:bg-background/20 text-white rounded-full backdrop-blur-sm"
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Título e información */}
          <div className="absolute top-4 left-4 z-50 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-lg">
            <p className="text-sm font-medium text-foreground">
              {title && <span className="mr-2">{title}</span>}
              <span className="text-muted-foreground">
                {currentIndex + 1} / {images.length}
              </span>
            </p>
          </div>

          {/* Controles de zoom */}
          <div className="absolute bottom-4 right-4 z-50 flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              className="bg-background/10 hover:bg-background/20 text-white rounded-full backdrop-blur-sm"
            >
              <ZoomOut className="h-5 w-5" />
            </Button>
            <div className="bg-background/80 backdrop-blur-sm px-3 py-2 rounded-lg text-sm font-medium">
              {Math.round(zoom * 100)}%
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              disabled={zoom >= 3}
              className="bg-background/10 hover:bg-background/20 text-white rounded-full backdrop-blur-sm"
            >
              <ZoomIn className="h-5 w-5" />
            </Button>
          </div>

          {/* Imagen principal con soporte de pinch-to-zoom, pan y swipe */}
          <div 
            className="w-full h-full flex items-center justify-center overflow-hidden p-16 touch-none"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <img
              src={images[currentIndex].url}
              alt={`${title || 'Imagen'} ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain animate-fade-in select-none"
              style={{ 
                transform: `scale(${zoom}) translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px) translateX(${swipeOffset}px)`,
                transition: (swipeOffset === 0 && !isPanning && !isPinching) ? 'transform 0.3s ease-out' : 'none',
                cursor: zoom > 1 ? 'grab' : 'default'
              }}
            />
          </div>

          {/* Navegación */}
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/10 hover:bg-background/20 text-white rounded-full backdrop-blur-sm h-12 w-12"
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/10 hover:bg-background/20 text-white rounded-full backdrop-blur-sm h-12 w-12"
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            </>
          )}

          {/* Thumbnails en la parte inferior */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-[80vw] overflow-x-auto pb-2 px-4">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden transition-all ${
                    index === currentIndex
                      ? 'ring-2 ring-primary scale-110'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={image.url}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
