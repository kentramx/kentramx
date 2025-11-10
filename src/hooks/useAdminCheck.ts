import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useAdminCheck = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) {
      setIsAdmin(false);
      setIsSuperAdmin(false);
      setAdminRole(null);
      setLoading(false);
      return;
    }

    try {
      // Verificar acceso administrativo general usando has_admin_access
      const { data: hasAccessData, error: accessError } = await (supabase.rpc as any)('has_admin_access', {
        _user_id: user.id,
      });

      if (accessError) {
        console.error('Error checking admin access:', accessError);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setAdminRole(null);
      } else {
        setIsAdmin(Boolean(hasAccessData));

        if (hasAccessData) {
          // Si tiene acceso admin, verificar si es super_admin
          const { data: isSuperData, error: superError } = await (supabase.rpc as any)('is_super_admin', {
            _user_id: user.id,
          });

          if (!superError) {
            setIsSuperAdmin(Boolean(isSuperData));
          }

          // Obtener el rol específico
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .in('role', ['super_admin', 'moderator', 'admin'] as any)
            .single();

          if (roleData) {
            setAdminRole(roleData.role);
          }
        }
      }
    } catch (error) {
      console.error('Error in admin check:', error);
      setIsAdmin(false);
      setIsSuperAdmin(false);
      setAdminRole(null);
    } finally {
      setLoading(false);
    }
  };

  return { isAdmin, isSuperAdmin, adminRole, loading };
};
