import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { SearchMap } from "@/components/SearchMap";
import { SearchResultsList } from "@/components/SearchResultsList";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePropertySearch } from "@/hooks/usePropertySearch";
import type { ViewportBounds } from "@/hooks/useTiledMap";
import { PlaceAutocomplete } from "@/components/PlaceAutocomplete";
import { buildPropertyFilters } from "@/utils/buildPropertyFilters";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useTracking } from "@/hooks/useTracking";
import {
  MapPin,
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Map as MapIcon,
  List as ListIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type Filters = {
  estado: string;
  municipio: string;
  colonia: string;
  precioMin: string;
  precioMax: string;
  tipo: string;
  listingType: "venta" | "renta";
  recamaras: string;
  banos: string;
  orden: string;
};

const Buscar = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFiltering, setIsFiltering] = useState(false);
  const { trackGA4Event } = useTracking();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const syncingFromUrl = useRef(false);

  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedPropertyFromMap, setSelectedPropertyFromMap] = useState<string | null>(null);

  const mapMoveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const SALE_MIN_PRICE = 0;
  const SALE_MAX_PRICE = 100;
  const RENT_MIN_PRICE = 0;
  const RENT_MAX_PRICE = 200;

  const getPriceRangeForListingType = (listingType: string): [number, number] => {
    if (listingType === "renta") {
      return [RENT_MIN_PRICE, RENT_MAX_PRICE];
    }
    return [SALE_MIN_PRICE, SALE_MAX_PRICE];
  };

  const convertSliderValueToPrice = (value: number, listingType: string): number => {
    const [min, max] = getPriceRangeForListingType(listingType);
    const step = listingType === "renta" ? 5 : 1;
    const converted = min + (value / 100) * (max - min);
    return Math.round(converted / step) * step;
  };

  const convertPriceToSliderValue = (price: number, listingType: string): number => {
    const [min, max] = getPriceRangeForListingType(listingType);
    if (price <= min) return 0;
    if (price >= max) return 100;
    return ((price - min) / (max - min)) * 100;
  };

  const getFormattedPrice = (price: number, listingType: string): string => {
    if (listingType === "renta") {
      return `$${price.toLocaleString()} mil`;
    }
    return `$${price.toLocaleString()} M`;
  };

  const defaultFilters: Filters = {
    estado: "",
    municipio: "",
    colonia: "",
    precioMin: "",
    precioMax: "",
    tipo: "",
    listingType: "",
    recamaras: "",
    banos: "",
    orden: "price_desc",
  };

  const [filters, setFilters] = useState<Filters>({
    estado: searchParams.get("estado") || "",
    municipio: searchParams.get("municipio") || "",
    colonia: searchParams.get("colonia") || "",
    precioMin: searchParams.get("precioMin") || "",
    precioMax: searchParams.get("precioMax") || "",
    tipo: searchParams.get("tipo") || "",
    listingType: (searchParams.get("listingType") as any) || "venta",
    recamaras: searchParams.get("recamaras") || "",
    banos: searchParams.get("banos") || "",
    orden: (searchParams.get("orden") as any) || "price_desc",
  });

  // 🗺️ Bounds actuales del mapa para sincronizar listado con viewport
  const [mapBounds, setMapBounds] = useState<ViewportBounds | null>(null);

  const propertyFilters = useMemo(() => {
    const baseFilters = buildPropertyFilters(filters);

    // 🗺️ Si hay bounds del mapa, filtramos la lista por viewport
    if (mapBounds) {
      return { ...baseFilters, bounds: mapBounds };
    }

    return baseFilters;
  }, [filters, mapBounds]);

  const {
    properties,
    isLoading: loading,
    isFetching,
    error: searchError,
    totalCount,
    hasNextPage,
    fetchNextPage,
    hasTooManyResults,
    actualTotal,
  } = usePropertySearch(propertyFilters);

  const sortedProperties = useMemo(() => {
    const sorted = [...properties];
    sorted.sort((a, b) => {
      const aFeatured = a.is_featured ? 1 : 0;
      const bFeatured = b.is_featured ? 1 : 0;
      if (aFeatured !== bFeatured) return bFeatured - aFeatured;

      switch (filters.orden) {
        case "price_asc":
          return a.price - b.price;
        case "newest":
          return (
            (a.created_at ? new Date(a.created_at).getTime() : 0) -
            (b.created_at ? new Date(b.created_at).getTime() : 0) * -1
          );
        case "oldest":
          return (
            (a.created_at ? new Date(a.created_at).getTime() : 0) -
            (b.created_at ? new Date(b.created_at).getTime() : 0)
          );
        case "bedrooms_desc":
          return (b.bedrooms || 0) - (a.bedrooms || 0);
        case "sqft_desc":
          return (b.sqft || 0) - (a.sqft || 0);
        default:
          return b.price - a.price;
      }
    });
    return sorted;
  }, [properties, filters.orden]);

  const filteredProperties = sortedProperties;

  const [searchCoordinates, setSearchCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  // ✅ Handler estabilizado: actualiza bounds visibles para sincronizar lista con mapa
  // Se debouncea para evitar loops y renders pesados
  const handleMapPositionChange = useCallback(
    (center: { lat: number; lng: number }, bounds: ViewportBounds) => {
      if (mapMoveTimerRef.current) {
        clearTimeout(mapMoveTimerRef.current);
      }
      mapMoveTimerRef.current = setTimeout(() => {
        console.log("🗺️ Mapa estabilizado en:", { center, bounds });
        setMapBounds(bounds);
        // NOTA: No actualizamos searchCoordinates aquí para evitar loops
      }, 500);
    },
    [setMapBounds],
  );

  useEffect(() => {
    const propertyId = searchParams.get("propiedad");
    if (propertyId) {
      setSelectedPropertyId(propertyId);
      setSheetOpen(true);
    } else {
      setSelectedPropertyId(null);
      setSheetOpen(false);
    }

    // ✅ Leer coordenadas del URL si existen
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    if (lat && lng) {
      setSearchCoordinates({ lat: parseFloat(lat), lng: parseFloat(lng) });
    } else {
      setSearchCoordinates(null);
    }

    const newFilters = {
      estado: searchParams.get("estado") || "",
      municipio: searchParams.get("municipio") || "",
      colonia: searchParams.get("colonia") || "",
      precioMin: searchParams.get("precioMin") || "",
      precioMax: searchParams.get("precioMax") || "",
      tipo: searchParams.get("tipo") || "",
      listingType: (searchParams.get("listingType") as any) || "venta",
      recamaras: searchParams.get("recamaras") || "",
      banos: searchParams.get("banos") || "",
      orden: (searchParams.get("orden") as any) || "price_desc",
    };

    if (JSON.stringify(newFilters) !== JSON.stringify(filters)) {
      setFilters(newFilters);
    }

    Promise.resolve().then(() => (syncingFromUrl.current = false));
  }, [searchParams]);

  const locationDisplayValue =
    filters.municipio && filters.estado ? `${filters.municipio}, ${filters.estado}` : filters.estado || "";

  const handleMarkerClick = useCallback(
    (propertyId: string) => {
      setSelectedPropertyFromMap(propertyId);
      setSelectedPropertyId(propertyId);
      setSheetOpen(true);
      trackGA4Event("marker_click", { property_id: propertyId });
    },
    [trackGA4Event],
  );

  const handlePropertyHoverFromMap = useCallback((propertyId: string | null) => {
    // Hover syncing handled in SearchResultsList
  }, []);

  const handlePropertyHover = useCallback((propertyId: string | null) => {
    // Hover syncing handled in SearchMap
  }, []);

  const hoveredProperty = filteredProperties.find((p) => p.id === selectedPropertyFromMap) || null;
  const hoveredPropertyCoords =
    hoveredProperty && hoveredProperty.lat && hoveredProperty.lng
      ? { lat: hoveredProperty.lat, lng: hoveredProperty.lng }
      : null;

  const [mapError, setMapError] = useState<string | null>(null);
  const [mapVisibleCount, setMapVisibleCount] = useState<number>(0);

  const handlePlaceSelect = (place: any) => {
    if (!place) return;

    const placeState = place?.state || "";
    const placeMunicipality = place?.municipality || "";
    const placeColonia = place?.colonia || "";

    const newFilters = {
      ...filters,
      estado: placeState,
      municipio: placeMunicipality,
      colonia: placeColonia,
    };

    setFilters(newFilters);

    // Actualizar URL
    const params = new URLSearchParams(searchParams);
    if (placeState) params.set("estado", placeState);
    else params.delete("estado");

    if (placeMunicipality) params.set("municipio", placeMunicipality);
    else params.delete("municipio");

    if (placeColonia) params.set("colonia", placeColonia);
    else params.delete("colonia");

    setSearchParams(params);

    trackGA4Event("place_select", {
      estado: placeState,
      municipio: placeMunicipality,
      colonia: placeColonia,
    });
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams);

    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });

    setSearchParams(params);
    trackGA4Event("apply_filters", filters);
    setIsFiltering(false);
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
    setMapBounds(null); // ✅ reset manual
    setSearchParams(new URLSearchParams());
    trackGA4Event("clear_filters");
  };

  const loadMoreProperties = () => {
    if (hasNextPage && !isFetching) {
      fetchNextPage();
    }
  };

  // ---- UI RENDER ----
  return (
    <div className="min-h-screen bg-background">
      <Navbar transparent={false} />

      <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)]">
        {/* MAPA */}
        <div className="flex-1 relative">
          <SearchMap
            filters={propertyFilters}
            searchCoordinates={searchCoordinates}
            onMarkerClick={handleMarkerClick}
            onPropertyHover={handlePropertyHoverFromMap}
            hoveredPropertyId={hoveredProperty?.id || null}
            hoveredPropertyCoords={hoveredPropertyCoords}
            height="100%"
            onMapError={setMapError}
            onVisibleCountChange={setMapVisibleCount}
            onMapPositionChange={handleMapPositionChange}
          />
        </div>

        {/* LISTA */}
        <div className="w-full lg:w-[420px] border-l bg-background overflow-y-auto">
          <SearchResultsList
            properties={filteredProperties}
            loading={loading}
            error={searchError}
            totalCount={totalCount}
            hasNextPage={hasNextPage}
            loadMore={loadMoreProperties}
            onHover={handlePropertyHover}
            selectedPropertyId={selectedPropertyId}
            onSelectProperty={(id: string) => {
              setSelectedPropertyId(id);
              setSheetOpen(true);
            }}
            hasTooManyResults={hasTooManyResults}
            actualTotal={actualTotal}
          />
        </div>
      </div>
    </div>
  );
};

export default Buscar;
