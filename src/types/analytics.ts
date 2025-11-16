/**
 * Tipos para analytics y métricas
 */

export interface AgentStats {
  total_properties: number;
  active_properties: number;
  total_views: number;
  total_favorites: number;
  total_conversations: number;
  conversion_rate: number;
}

export interface PropertyPerformance {
  id: string;
  title: string;
  views: number;
  favorites: number;
  conversations: number;
}

export interface ViewsOverTime {
  date: string;
  views: number;
}

export interface ModerationMetrics {
  totalReviewed: number;
  approvalRate: number;
  avgReviewTime: number;
  resubmissionRate: number;
}

export interface ModerationTrendData {
  date: string;
  aprobadas: number;
  rechazadas: number;
  reenviadas: number;
  auto_aprobadas: number;
}

export interface ReviewTimeData {
  date: string;
  avg_time?: number;
  tiempo?: number; // Alias para compatibility
}

export interface RejectionReasonData {
  name: string;
  value: number;
}

export interface AdminStatsData {
  id: string;
  admin_name: string;
  total: number;
  approved: number;
  rejected: number;
  approval_rate: number;
}

export interface SubscriptionChangeMetadata {
  bypassed_cooldown?: boolean;
  changed_by_admin?: boolean;
  new_plan_name?: string;
  old_plan_name?: string;
  [key: string]: unknown;
}

export interface SubscriptionChangeRecord {
  id: string;
  user_id: string;
  change_type: string;
  changed_at: string;
  metadata?: SubscriptionChangeMetadata;
}

export interface RealtimeNotification {
  id: string;
  type: 'bypass' | 'upgrade' | 'downgrade' | 'unusual';
  message: string;
  timestamp: string;
  metadata: SubscriptionChangeRecord;
  read: boolean;
}

export interface NotificationPreferences {
  notify_on_bypass: boolean;
  notify_on_upgrade: boolean;
  notify_on_downgrade: boolean;
  use_toast: boolean;
  use_sound: boolean;
  use_email: boolean;
}
