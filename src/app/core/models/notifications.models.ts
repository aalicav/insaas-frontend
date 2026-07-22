export interface Notification {
  id: string;
  organizationId: string;
  userId: string;
  category: 'risk' | 'contract' | 'lifecycle' | string;
  type: string;
  title: string;
  body: string;
  severity: 'info' | 'warning' | 'risk' | string;
  resourceType: string | null;
  resourceId: string | null;
  metadata: unknown | null;
  dedupeKey: string | null;
  readAt: string | null;
  emailSentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsListParams {
  unread?: boolean;
  limit?: number;
  skip?: number;
}

export interface NotificationsListResponse {
  items: Notification[];
  total: number;
  limit: number;
  skip: number;
}

export interface UnreadCountResponse {
  count: number;
}

export interface ReadAllResponse {
  updated: number;
}
