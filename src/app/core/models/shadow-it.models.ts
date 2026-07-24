export type ShadowAppStatus = 'unmanaged' | 'ignored' | 'sanctioned';

export interface ShadowItSummary {
  unmanaged: number;
  ignored: number;
  sensitive: number;
}

export interface ShadowApp {
  id: string;
  name: string;
  status: ShadowAppStatus;
  criticality: string;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  sourceAppId: string | null;
  provider: string | null;
  externalId: string | null;
  category: string | null;
  connectionId: string | null;
  userConsentCount: number;
  scopes: string[];
  sensitiveScopes: boolean;
  homepage: string | null;
  publisherName: string | null;
  discovery: string | null;
}

export interface ShadowItListParams {
  q?: string;
  includeIgnored?: boolean;
}
