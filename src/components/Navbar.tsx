import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Home, Heart, User, PlusCircle, LogOut } from "lucide-react";
import { MessageBadge } from "./MessageBadge";
import { HeaderSearchBar } from "./HeaderSearchBar";
import { MobileMenu } from "./MobileMenu";
import { ThemeToggle } from "./ThemeToggle";

const Navbar = () => {
  const { user, signOut } = useAuth();

  const getUserInitials = () => {
    if (!user?.email) return "U";
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        {/* Desktop & Mobile Header */}
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 shrink-0">
            <Home className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-primary hidden sm:inline">Kentra</span>
          </Link>

          {/* Search Bar - Hidden on mobile */}
          <div className="hidden md:flex flex-1 justify-center max-w-2xl mx-4">
            <HeaderSearchBar />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            <Link to="/propiedades">
              <Button variant="ghost" size="sm">Propiedades</Button>
            </Link>
            <Link to="/buscar">
              <Button variant="ghost" size="sm">Buscar</Button>
            </Link>
            
            {user ? (
              <>
                <MessageBadge />
                <Link to="/favoritos">
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Heart className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/panel-agente">
                  <Button variant="secondary" size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Mis Propiedades
                  </Button>
                </Link>
                <ThemeToggle />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <Link to="/perfil">
                      <DropdownMenuItem className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        Mi Perfil
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      Cerrar Sesión
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <ThemeToggle />
                <Link to="/auth">
                  <Button variant="default" size="sm">Iniciar Sesión</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Navigation */}
          <div className="flex md:hidden items-center gap-2">
            {user && <MessageBadge />}
            <MobileMenu />
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden pb-3">
          <HeaderSearchBar />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
