import { useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PlaceAutocomplete } from "./PlaceAutocomplete";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LocationData {
  address: string;
  municipality: string;
  state: string;
  coordinates: { lat: number; lng: number };
}

export function HeaderSearchBar() {
  const navigate = useNavigate();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [transactionType, setTransactionType] = useState<string>("sale");
  const [propertyType, setPropertyType] = useState<string>("all");

  const handlePlaceSelect = (place: {
    address: string;
    municipality: string;
    state: string;
    lat?: number;
    lng?: number;
  }) => {
    if (place.lat && place.lng) {
      setLocation({
        address: place.address,
        municipality: place.municipality,
        state: place.state,
        coordinates: { lat: place.lat, lng: place.lng },
      });
    }
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (location) {
      params.set("lat", location.coordinates.lat.toString());
      params.set("lng", location.coordinates.lng.toString());
      params.set("address", location.address);
    }
    params.set("type", transactionType);
    if (propertyType !== "all") {
      params.set("propertyType", propertyType);
    }
    navigate(`/buscar?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2 bg-background/50 backdrop-blur-sm border border-border rounded-lg p-1.5 w-full max-w-3xl">
      <div className="flex-1 min-w-0">
        <PlaceAutocomplete
          onPlaceSelect={handlePlaceSelect}
          placeholder="Buscar ubicación..."
          id="header-search"
        />
      </div>
      
      <div className="hidden md:flex items-center gap-2">
        <Select value={transactionType} onValueChange={setTransactionType}>
          <SelectTrigger className="w-28 h-9 border-0 bg-transparent">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sale">Venta</SelectItem>
            <SelectItem value="rent">Renta</SelectItem>
          </SelectContent>
        </Select>

        <Select value={propertyType} onValueChange={setPropertyType}>
          <SelectTrigger className="w-32 h-9 border-0 bg-transparent">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="house">Casa</SelectItem>
            <SelectItem value="apartment">Apartamento</SelectItem>
            <SelectItem value="condo">Condominio</SelectItem>
            <SelectItem value="land">Terreno</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleSearch}>
        <Search className="h-4 w-4" />
      </Button>
    </div>
  );
}
