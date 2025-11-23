import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { SearchMap } from "@/components/SearchMap";
import { SearchResultsList } from "@/components/SearchResultsList";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePropertySearch } from "@/hooks/usePropertySearch";
import type { ViewportBounds } from "@/hooks/useTiledMap";
import { PlaceAutocomplete } from "@/components/PlaceAutocomplete";
import { buildPropertyFilters } from "@/utils/buildPropertyFilters";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Star, X, ChevronDown, SlidersHorizontal, Loader2, Map as MapIcon, List as ListIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useTracking } from "@/hooks/useTracking";
import { SEOHead } from "@/components/SEOHead";
import { generateSearchTitle, generateSearchDescription } from "@/utils/seo";
import { generatePropertyListStructuredData } from "@/utils/structuredData";
import { PropertyDetailSheet } from "@/components/PropertyDetailSheet";
import { InfiniteScrollContainer } from "@/components/InfiniteScrollContainer";
import { monitoring } from "@/lib/monitoring";
import type { MapProperty, HoveredProperty } from "@/types/property";
import { cn } from "@/lib/utils";

interface Filters {
  estado: string;
  municipio: string;
  colonia: string;
  precioMin: string;
  precioMax: string;
  tipo: string;
  listingType: "venta" | "renta";
  recamaras: string;
  banos: string;
  orden: "price_desc" | "price_asc" | "newest" | "oldest" | "bedrooms_desc" | "sqft_desc";
}

const getTipoLabel = (tipo: string) => {
  const labels: Record<string, string> = {
    casa: "🏠 Casa",
    departamento: "🏢 Depto",
    terreno: "🌳 Terreno",
    oficina: "💼 Oficina",
    local: "🏪 Local",
    bodega: "📦 Bodega",
    edificio: "🏛️ Edificio",
    rancho: "🐎 Rancho",
  };
  return labels[tipo] || tipo;
};

// helper para comparar bounds y evitar churn
const sameBounds = (a: ViewportBounds | null, b: ViewportBounds | null) => {
  if (!a || !b) return false;
  return a.minLat === b.minLat && a.maxLat === b.maxLat && a.minLng === b.minLng && a.maxLng === b.maxLng;
};

const Buscar = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { trackGA4Event } = useTracking();

  const syncingFromUrl = useRef(false);

  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedPropertyFromMap, setSelectedPropertyFromMap] = useState<string | null>(null);

  const mapMoveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const SALE_MIN_PRICE = 0;
  const SALE_MAX_PRICE = 100;
  const RENT_MIN_PRICE = 0;
  const RENT_MAX_PRICE = 200;

  const getPriceRangeForListingType = (listingType: "venta" | "renta"): [number, number] => {
    return listingType === "renta" ? [RENT_MIN_PRICE, RENT_MAX_PRICE] : [SALE_MIN_PRICE, SALE_MAX_PRICE];
  };

  const convertSliderValueToPrice = (value: number, listingType: "venta" | "renta"): number => {
    return listingType === "renta" ? value * 1000 : value * 1000000;
  };

  const [priceRange, setPriceRange] = useState<[number, number]>([SALE_MIN_PRICE, SALE_MAX_PRICE]);
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const DEFAULT_FILTERS: Filters = {
    estado: "",
    municipio: "",
    colonia: "",
    precioMin: "",
    precioMax: "",
    tipo: "",
    listingType: "venta",
    recamaras: "",
    banos: "",
    orden: "price_desc",
  };

  const [filters, setFilters] = useState<Filters>({
    estado: (searchParams.get("estado") || "") as string,
    municipio: (searchParams.get("municipio") || "") as string,
    colonia: (searchParams.get("colonia") || "") as string,
    precioMin: (searchParams.get("precioMin") || "") as string,
    precioMax: (searchParams.get("precioMax") || "") as string,
    tipo: (searchParams.get("tipo") || "") as string,
    listingType: ((searchParams.get("listingType") as any) || "venta") as "venta" | "renta",
    recamaras: (searchParams.get("recamaras") || "") as string,
    banos: (searchParams.get("banos") || "") as string,
    orden: ((searchParams.get("orden") as any) || "price_desc") as Filters["orden"],
  });

  // 🗺️ Bounds para sincronizar la LISTA con el viewport del mapa
  const [mapBounds, setMapBounds] = useState<ViewportBounds | null>(null);

  // ✅ 1) Filtros del MAPA (SIN bounds)
  const mapFilters = useMemo(() => buildPropertyFilters(filters), [filters]);

  // ✅ 2) Filtros de la LISTA (con bounds cuando existan)
  const listFilters = useMemo(() => {
    return mapBounds ? { ...mapFilters, bounds: mapBounds } : mapFilters;
  }, [mapFilters, mapBounds]);

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
  } = usePropertySearch(listFilters); // 👈 LISTA usa bounds

  const sortedProperties = useMemo(() => {
    const sorted = [...properties];
    sorted.sort((a, b) => {
      const aFeatured = a.is_featured ? 1 : 0;
      const bFeatured = b.is_featured ? 1 : 0;
      if (aFeatured !== bFeatured) return bFeatured - aFeatured;

      switch (filters.orden) {
        case "price_desc":
          return b.price - a.price;
        case "price_asc":
          return a.price - b.price;
        case "newest":
          return (
            (b.created_at ? new Date(b.created_at).getTime() : 0) -
            (a.created_at ? new Date(a.created_at).getTime() : 0)
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

  // ✅ Actualiza bounds SOLO si cambiaron (evita churn)
  const handleMapPositionChange = useCallback(
    (center: { lat: number; lng: number }, bounds: ViewportBounds) => {
      if (mapMoveTimerRef.current) clearTimeout(mapMoveTimerRef.current);
      mapMoveTimerRef.current = setTimeout(() => {
        if (!sameBounds(mapBounds, bounds)) {
          monitoring.debug("[Buscar] Bounds nuevos", { center, bounds });
          setMapBounds(bounds);
        }
      }, 500);
    },
    [mapBounds],
  );

  useEffect(() => {
    const propertyId = searchParams.get("propiedad");
    if (propertyId) {
      setSelectedPropertyId(propertyId);
      setSheetOpen(true);
    } else {
      setSheetOpen(false);
      setSelectedPropertyId(null);
    }
  }, [searchParams]);

  const handlePropertyClick = useCallback(
    (id: string) => {
      setSelectedPropertyId(id);
      setSheetOpen(true);
      const newParams = new URLSearchParams(searchParams);
      newParams.set("propiedad", id);
      setSearchParams(newParams, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleCloseSheet = () => {
    setSheetOpen(false);
    setSelectedPropertyId(null);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("propiedad");
    setSearchParams(newParams, { replace: true });
  };

  useEffect(() => {
    syncingFromUrl.current = true;

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
      listingType: ((searchParams.get("listingType") as any) || "venta") as "venta" | "renta",
      recamaras: searchParams.get("recamaras") || "",
      banos: searchParams.get("banos") || "",
      orden: ((searchParams.get("orden") as any) || "price_desc") as Filters["orden"],
    };

    if (JSON.stringify(newFilters) !== JSON.stringify(filters)) {
      setFilters(newFilters);
    }

    Promise.resolve().then(() => (syncingFromUrl.current = false));
  }, [searchParams]); // intencional sin filters

  const locationDisplayValue =
    filters.municipio && filters.estado ? `${filters.municipio}, ${filters.estado}` : filters.estado || "";

  const [hoveredProperty, setHoveredProperty] = useState<MapProperty | null>(null);
  const hoverFromMap = useRef(false);
  const [mobileView, setMobileView] = useState<"map" | "list">("list");
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapVisibleCount, setMapVisibleCount] = useState<number>(0);

  const [minRangeForType, maxRangeForType] = getPriceRangeForListingType(filters.listingType);
  const safePriceRange: [number, number] = [
    Math.max(minRangeForType, Math.min(priceRange[0], maxRangeForType)),
    Math.max(minRangeForType, Math.min(priceRange[1], maxRangeForType)),
  ];

  const handlePropertyHoverFromMap = useCallback((property: MapProperty | null) => {
    hoverFromMap.current = true;
    setHoveredProperty(property);
  }, []);

  const handlePropertyHoverFromList = useCallback((property: HoveredProperty | null) => {
    hoverFromMap.current = false;
    if (property && property.lat && property.lng) {
      setHoveredProperty({
        id: property.id,
        title: property.title,
        price: property.price,
        currency: property.currency,
        lat: property.lat,
        lng: property.lng,
      } as MapProperty);
    } else {
      setHoveredProperty(null);
    }
  }, []);

  const hoveredPropertyCoords = useMemo(
    () =>
      hoveredProperty?.lat && hoveredProperty?.lng ? { lat: hoveredProperty.lat, lng: hoveredProperty.lng } : null,
    [hoveredProperty?.lat, hoveredProperty?.lng],
  );

  const handleMarkerClick = useCallback(
    (propertyId: string) => {
      monitoring.debug("[Buscar] Click en marcador", { propertyId });
      setSelectedPropertyFromMap(propertyId);
      handlePropertyClick(propertyId);
      setTimeout(() => setSelectedPropertyFromMap(null), 3000);
    },
    [handlePropertyClick],
  );

  const handleSearchInputChange = (value: string) => {
    if (!value || value.trim() === "") {
      setFilters((prev) => {
        if (!prev.estado && !prev.municipio) return prev;
        return { ...prev, estado: "", municipio: "" };
      });
      setSearchCoordinates(null);
      setMapBounds(null); // ✅ reset bounds
    }
  };

  const handlePlaceSelect = (location: any) => {
    setFilters((prev) => ({
      ...prev,
      estado: location.state || "",
      municipio: location.municipality || "",
      colonia: location.colonia || "",
    }));
    if (location.lat && location.lng) {
      setSearchCoordinates({ lat: location.lat, lng: location.lng });
    }
    setMapBounds(null); // ✅ reset bounds
    toast({ title: "Ubicación seleccionada", description: `${location.municipality}, ${location.state}` });
  };

  const seoTitle = generateSearchTitle(filters);
  const seoDescription = generateSearchDescription({ ...filters, resultCount: filteredProperties.length });
  const listStructuredData = generatePropertyListStructuredData(
    filteredProperties.slice(0, 10).map((p) => ({
      id: p.id,
      title: p.title,
      price: p.price,
      url: `${window.location.origin}/property/${p.id}`,
      image: p.images?.[0]?.url,
    })),
    filters.municipio || filters.estado || "Propiedades en México",
  );

  if (loading && !properties.length) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-screen gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando propiedades...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title={seoTitle} description={seoDescription} canonical="/buscar" structuredData={listStructuredData} />
      <Navbar />

      <div className="pt-16">
        {/* Barra Superior */}
        <div className="border-b bg-background sticky top-16 z-30">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="min-w-[240px] flex-1 lg:flex-initial relative">
                <PlaceAutocomplete
                  onPlaceSelect={handlePlaceSelect}
                  onInputChange={handleSearchInputChange}
                  placeholder="Ciudad, código postal..."
                  defaultValue={locationDisplayValue}
                  showIcon={true}
                  label=""
                />
                {locationDisplayValue && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 z-20"
                    onClick={() => {
                      setFilters(DEFAULT_FILTERS);
                      setSearchCoordinates(null);
                      setMapBounds(null); // ✅ reset bounds
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <Separator orientation="vertical" className="h-8 hidden lg:block" />

              {/* Botón Filtros Móvil */}
              <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="lg:hidden">
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Filtros
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[90vh]">
                  <SheetTitle>Filtros</SheetTitle>
                  <ScrollArea className="h-[calc(90vh-120px)] mt-4">
                    <div className="p-4">
                      <p>Opciones de filtro aquí...</p>
                    </div>
                  </ScrollArea>
                </SheetContent>
              </Sheet>

              {/* Filtros Desktop */}
              <div className="hidden lg:flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      {filters.tipo ? getTipoLabel(filters.tipo) : "Tipo"} <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-96" align="start">
                    <div className="grid grid-cols-3 gap-2">
                      {["casa", "departamento", "terreno", "oficina", "local"].map((t) => (
                        <Button key={t} variant="ghost" onClick={() => setFilters((p) => ({ ...p, tipo: t }))}>
                          {t}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      Precio <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="p-4">
                      {/* ✅ slider dinámico */}
                      <Slider
                        min={minRangeForType}
                        max={maxRangeForType}
                        step={1}
                        value={safePriceRange}
                        onValueChange={(values) => {
                          setPriceRange(values as [number, number]);
                          const [minR, maxR] = getPriceRangeForListingType(filters.listingType);
                          setFilters((prev) => ({
                            ...prev,
                            precioMin:
                              values[0] === minR
                                ? ""
                                : convertSliderValueToPrice(values[0], prev.listingType).toString(),
                            precioMax:
                              values[1] === maxR
                                ? ""
                                : convertSliderValueToPrice(values[1], prev.listingType).toString(),
                          }));
                        }}
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>

        {/* Layout Mapa/Lista */}
        <div className="flex flex-col lg:flex-row lg:h-full" style={{ height: "calc(100vh - 140px)" }}>
          {/* Toggle Móvil */}
          <div className="lg:hidden sticky top-0 z-20 bg-background border-b p-2">
            <div className="flex gap-2">
              <Button
                variant={mobileView === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setMobileView("list")}
                className="flex-1"
              >
                <ListIcon className="h-4 w-4 mr-2" /> Lista
              </Button>
              <Button
                variant={mobileView === "map" ? "default" : "outline"}
                size="sm"
                onClick={() => setMobileView("map")}
                className="flex-1"
              >
                <MapIcon className="h-4 w-4 mr-2" /> Mapa
              </Button>
            </div>
          </div>

          {/* Mapa */}
          <div
            className={`relative ${mobileView === "map" ? "block" : "hidden"} lg:block lg:w-1/2 lg:h-full`}
            style={{ height: "calc(100vh - 140px)" }}
          >
            <div className="absolute top-4 left-4 z-10 bg-background/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">
                  {mobileView === "map" || window.innerWidth >= 1024 ? mapVisibleCount : totalCount}
                </span>
                <span className="text-muted-foreground text-sm">propiedades en mapa</span>
              </div>
            </div>

            {mapError ? (
              <div className="flex h-full items-center justify-center p-8">
                <p>Error en el mapa</p>
              </div>
            ) : (
              <SearchMap
                filters={mapFilters} // 👈 MAPA sin bounds externos
                searchCoordinates={searchCoordinates}
                onMarkerClick={handleMarkerClick}
                onPropertyHover={handlePropertyHoverFromMap}
                hoveredPropertyId={hoveredProperty?.id || null}
                hoveredPropertyCoords={hoveredPropertyCoords}
                height="100%"
                onMapError={setMapError}
                onVisibleCountChange={setMapVisibleCount}
                onMapPositionChange={handleMapPositionChange} // 👈 manda bounds a lista
              />
            )}
          </div>

          {/* Lista */}
          <div className={`w-full lg:w-1/2 overflow-y-auto ${mobileView === "list" ? "block" : "hidden"} lg:block`}>
            {!searchError && filteredProperties.length > 0 && (
              <InfiniteScrollContainer
                onLoadMore={() => {
                  if (hasNextPage && !isFetching) fetchNextPage();
                }}
                hasMore={!!hasNextPage}
                isLoading={isFetching}
                className="space-y-4"
              >
                <div className="px-4 py-2 text-sm text-muted-foreground">
                  Mostrando {properties.length} resultados en esta zona
                </div>
                <SearchResultsList
                  properties={filteredProperties}
                  isLoading={loading && properties.length === 0}
                  listingType={filters.listingType}
                  onPropertyClick={handlePropertyClick}
                  onPropertyHover={handlePropertyHoverFromList}
                  savedSearchesCount={user ? savedSearches.length : 0}
                  highlightedPropertyId={selectedPropertyFromMap}
                  scrollToPropertyId={selectedPropertyFromMap}
                  hoveredPropertyId={hoveredProperty?.id || null}
                />
              </InfiniteScrollContainer>
            )}

            {!searchError && !loading && filteredProperties.length === 0 && (
              <div className="flex flex-col items-center justify-center p-12 space-y-4 text-center min-h-[400px]">
                <div className="rounded-full bg-muted p-6">
                  <Star className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3>No encontramos propiedades en esta zona</h3>
                <Button
                  onClick={() => {
                    setFilters(DEFAULT_FILTERS);
                    setSearchCoordinates(null);
                    setMapBounds(null);
                  }}
                >
                  Ver todas las zonas
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <PropertyDetailSheet propertyId={selectedPropertyId} open={sheetOpen} onClose={handleCloseSheet} />
    </div>
  );
};

export default Buscar;
