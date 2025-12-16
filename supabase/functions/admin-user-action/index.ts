import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserActionRequest {
  action: 'suspend' | 'activate' | 'ban' | 'change-role' | 'delete' | 'reset-password' | 'resend-verification' | 'bulk-suspend' | 'bulk-activate' | 'bulk-delete';
  userId?: string;
  userIds?: string[];
  reason?: string;
  newRole?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Verify caller is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify user token and check admin role
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: adminUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !adminUser) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if caller is super_admin or moderator
    const { data: isAdmin } = await supabaseAdmin.rpc('has_admin_access', { _user_id: adminUser.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if caller is super_admin (for certain actions)
    const { data: isSuperAdmin } = await supabaseAdmin.rpc('is_super_admin', { _user_id: adminUser.id });

    // Parse request body
    const request: UserActionRequest = await req.json();
    const { action, userId, userIds, reason, newRole } = request;

    if (!action) {
      return new Response(JSON.stringify({ error: 'Missing action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle bulk actions
    if (action.startsWith('bulk-')) {
      if (!userIds || userIds.length === 0) {
        return new Response(JSON.stringify({ error: 'userIds array is required for bulk actions' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Filter out self and super_admins from bulk actions
      const filteredIds = [];
      for (const id of userIds) {
        if (id === adminUser.id) continue;
        const { data: targetIsSuperAdmin } = await supabaseAdmin.rpc('is_super_admin', { _user_id: id });
        if (targetIsSuperAdmin) continue;
        filteredIds.push(id);
      }

      if (filteredIds.length === 0) {
        return new Response(JSON.stringify({ error: 'No valid users to perform action on' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let bulkResult;
      switch (action) {
        case 'bulk-suspend': {
          const { error } = await supabaseAdmin
            .from('profiles')
            .update({
              status: 'suspended',
              suspended_at: new Date().toISOString(),
              suspended_reason: reason || 'Bulk suspended by admin',
              suspended_by: adminUser.id,
            })
            .in('id', filteredIds);

          if (error) throw error;
          bulkResult = { success: true, message: `${filteredIds.length} users suspended`, affected: filteredIds.length };
          console.log(`[admin-user-action] Bulk suspend: ${filteredIds.length} users by ${adminUser.id}`);
          break;
        }

        case 'bulk-activate': {
          const { error } = await supabaseAdmin
            .from('profiles')
            .update({
              status: 'active',
              suspended_at: null,
              suspended_reason: null,
              suspended_by: null,
            })
            .in('id', filteredIds);

          if (error) throw error;
          bulkResult = { success: true, message: `${filteredIds.length} users activated`, affected: filteredIds.length };
          console.log(`[admin-user-action] Bulk activate: ${filteredIds.length} users by ${adminUser.id}`);
          break;
        }

        case 'bulk-delete': {
          if (!isSuperAdmin) {
            return new Response(JSON.stringify({ error: 'Only super admins can delete users' }), {
              status: 403,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          let deleted = 0;
          for (const id of filteredIds) {
            const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
            if (!error) deleted++;
          }
          bulkResult = { success: true, message: `${deleted} users deleted`, affected: deleted };
          console.log(`[admin-user-action] Bulk delete: ${deleted} users by ${adminUser.id}`);
          break;
        }

        default:
          return new Response(JSON.stringify({ error: `Unknown bulk action: ${action}` }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
      }

      return new Response(JSON.stringify(bulkResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Single user actions require userId
    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prevent self-actions (except password reset and verification)
    if (userId === adminUser.id && !['reset-password', 'resend-verification'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Cannot perform this action on yourself' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if target user is super_admin (cannot suspend/ban/delete super_admins)
    const { data: targetIsSuperAdmin } = await supabaseAdmin.rpc('is_super_admin', { _user_id: userId });
    
    if (targetIsSuperAdmin && ['suspend', 'ban', 'delete'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Cannot perform this action on a super admin' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let result;

    switch (action) {
      case 'suspend': {
        const { error } = await supabaseAdmin
          .from('profiles')
          .update({
            status: 'suspended',
            suspended_at: new Date().toISOString(),
            suspended_reason: reason || 'Suspended by admin',
            suspended_by: adminUser.id,
          })
          .eq('id', userId);

        if (error) throw error;
        result = { success: true, message: 'User suspended successfully' };
        console.log(`[admin-user-action] User ${userId} suspended by ${adminUser.id}. Reason: ${reason}`);
        break;
      }

      case 'activate': {
        const { error } = await supabaseAdmin
          .from('profiles')
          .update({
            status: 'active',
            suspended_at: null,
            suspended_reason: null,
            suspended_by: null,
          })
          .eq('id', userId);

        if (error) throw error;
        result = { success: true, message: 'User activated successfully' };
        console.log(`[admin-user-action] User ${userId} activated by ${adminUser.id}`);
        break;
      }

      case 'ban': {
        if (!isSuperAdmin) {
          return new Response(JSON.stringify({ error: 'Only super admins can ban users' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { error } = await supabaseAdmin
          .from('profiles')
          .update({
            status: 'banned',
            suspended_at: new Date().toISOString(),
            suspended_reason: reason || 'Banned by admin',
            suspended_by: adminUser.id,
          })
          .eq('id', userId);

        if (error) throw error;
        result = { success: true, message: 'User banned successfully' };
        console.log(`[admin-user-action] User ${userId} banned by ${adminUser.id}. Reason: ${reason}`);
        break;
      }

      case 'change-role': {
        if (!newRole) {
          return new Response(JSON.stringify({ error: 'newRole is required for change-role action' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Only super_admin can assign admin/super_admin/moderator roles
        const adminRoles = ['admin', 'super_admin', 'moderator'];
        if (adminRoles.includes(newRole) && !isSuperAdmin) {
          return new Response(JSON.stringify({ error: 'Only super admins can assign admin roles' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check if user already has this role
        const { data: existingRoles } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);

        const hasRole = existingRoles?.some(r => r.role === newRole);

        if (hasRole) {
          // Remove the role
          const { error } = await supabaseAdmin
            .from('user_roles')
            .delete()
            .eq('user_id', userId)
            .eq('role', newRole);

          if (error) throw error;
          result = { success: true, message: `Role ${newRole} removed from user` };
          console.log(`[admin-user-action] Role ${newRole} removed from user ${userId} by ${adminUser.id}`);
        } else {
          // Add the role
          const { error } = await supabaseAdmin
            .from('user_roles')
            .insert({
              user_id: userId,
              role: newRole,
              granted_by: adminUser.id,
              granted_at: new Date().toISOString(),
            });

          if (error) throw error;
          result = { success: true, message: `Role ${newRole} added to user` };
          console.log(`[admin-user-action] Role ${newRole} added to user ${userId} by ${adminUser.id}`);
        }
        break;
      }

      case 'delete': {
        if (!isSuperAdmin) {
          return new Response(JSON.stringify({ error: 'Only super admins can delete users' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Delete from auth.users (cascades to profiles due to FK)
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (error) throw error;
        result = { success: true, message: 'User deleted successfully' };
        console.log(`[admin-user-action] User ${userId} deleted by ${adminUser.id}`);
        break;
      }

      case 'reset-password': {
        // Get user email
        const { data: { user: targetUser }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        if (userError || !targetUser?.email) {
          return new Response(JSON.stringify({ error: 'User not found or has no email' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Send password reset email
        const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(targetUser.email, {
          redirectTo: `${supabaseUrl.replace('.supabase.co', '')}/reset-password`,
        });

        if (resetError) throw resetError;
        result = { success: true, message: `Password reset email sent to ${targetUser.email}` };
        console.log(`[admin-user-action] Password reset sent to ${targetUser.email} by ${adminUser.id}`);
        break;
      }

      case 'resend-verification': {
        // Get user email
        const { data: { user: targetUser }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        if (userError || !targetUser?.email) {
          return new Response(JSON.stringify({ error: 'User not found or has no email' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (targetUser.email_confirmed_at) {
          return new Response(JSON.stringify({ error: 'Email is already verified' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Resend verification email using generateLink and then sending via Resend or just update user
        const { error: resendError } = await supabaseAdmin.auth.resend({
          type: 'signup',
          email: targetUser.email,
        });

        if (resendError) throw resendError;
        result = { success: true, message: `Verification email resent to ${targetUser.email}` };
        console.log(`[admin-user-action] Verification email resent to ${targetUser.email} by ${adminUser.id}`);
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in admin-user-action:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
