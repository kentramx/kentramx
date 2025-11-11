import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useRequire2FA } from "@/hooks/useRequire2FA";
import Navbar from "@/components/Navbar";
import { MarketingMetrics } from "@/components/MarketingMetrics";
import { Loader2, TrendingUp } from "lucide-react";
import { DynamicBreadcrumbs } from "@/components/DynamicBreadcrumbs";

const AdminMarketing = () => {
  const navigate = useNavigate();
  const { isSuperAdmin, loading: adminLoading } = useAdminCheck();
  const { requirementMet, checking: mfaChecking } = useRequire2FA();

  useEffect(() => {
    if (!adminLoading && !isSuperAdmin) {
      navigate("/");
    }
  }, [isSuperAdmin, adminLoading, navigate]);

  if (adminLoading || mfaChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin || !requirementMet) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <DynamicBreadcrumbs 
          items={[
            { label: 'Inicio', href: '/', active: false },
            { label: 'Panel de Administración', href: '/admin/dashboard', active: false },
            { label: 'Dashboard de Marketing', href: '', active: true }
          ]} 
          className="mb-4" 
        />

        <div className="flex items-center gap-3 mb-8">
          <TrendingUp className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Dashboard de Marketing</h1>
        </div>

        <MarketingMetrics />
      </div>
    </div>
  );
};

export default AdminMarketing;
