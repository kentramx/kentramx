import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Heart, User, PlusCircle } from "lucide-react";

const Navbar = () => {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center space-x-2">
          <Home className="h-6 w-6 text-primary" />
          <span className="text-2xl font-bold text-primary">Kentra</span>
        </Link>

        <div className="flex items-center gap-4">
          <Link to="/propiedades">
            <Button variant="ghost">Propiedades</Button>
          </Link>
          <Link to="/favoritos">
            <Button variant="ghost" size="icon">
              <Heart className="h-5 w-5" />
            </Button>
          </Link>
          <Link to="/publicar">
            <Button variant="secondary">
              <PlusCircle className="mr-2 h-4 w-4" />
              Publicar Propiedad
            </Button>
          </Link>
          <Link to="/auth">
            <Button variant="outline" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
