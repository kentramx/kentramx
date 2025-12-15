import React from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlaceAutocomplete } from "@/components/PlaceAutocomplete";

interface SearchBarProps {
  onPlaceSelect: (location: {
    address: string;
    municipality: string;
    state: string;
    lat?: number;
    lng?: number;
  }) => void;
  onSearch: () => void;
  placeholder?: string;
  defaultValue?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onPlaceSelect,
  onSearch,
  placeholder = "Ciudad, colonia o código postal",
  defaultValue = "",
  className = "",
}) => {
  return (
    <div className={`w-full ${className}`}>
      <div className="group relative mx-auto flex w-full max-w-4xl items-center gap-2 rounded-full border-2 border-primary/60 bg-background p-2 shadow-2xl ring-offset-background focus-within:ring-2 focus-within:ring-primary/60 focus-within:ring-offset-2">
        <div className="flex-1 min-w-0 text-foreground">
          <PlaceAutocomplete
            onPlaceSelect={onPlaceSelect}
            placeholder={placeholder}
            defaultValue={defaultValue}
            showIcon
            unstyled
          />
        </div>
        <Button
          onClick={onSearch}
          size="lg"
          className="shrink-0 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-6 text-white font-semibold shadow-lg shadow-amber-500/30 hover:from-amber-600 hover:to-amber-700 hover:shadow-xl hover:shadow-amber-500/40 transition-all duration-300"
        >
          <Search className="mr-2 h-5 w-5" />
          Buscar
        </Button>
      </div>
    </div>
  );
};
