export type ContractStatus = 'draft' | 'active' | 'expired' | 'cancelled';

export interface ContractLineAllocationInput {
  orgUnitId: string;
  percent?: number;
}

export interface ContractLineItemInput {
  name: string;
  skuHint?: string;
  quantity: number;
  unitAmountMinor: number;
  amountPeriod?: 'per_seat_month' | 'per_seat_year' | 'fixed_period';
  licenseId?: string;
  provider?: string;
  allocationMode?: 'equal_by_assignees' | 'percent_split' | 'single_unit';
  allocationKind?: 'team' | 'cost_center';
  allocations?: ContractLineAllocationInput[];
}

export interface CreateContractRequest {
  managedAppId: string;
  vendorName?: string;
  vendorTaxId?: string;
  status?: ContractStatus;
  startsOn: string;
  endsOn?: string;
  autoRenew?: boolean;
  noticeDays?: number;
  billingCycle?: 'monthly' | 'yearly' | 'custom';
  chargeType?: 'prepaid' | 'postpaid' | 'on_demand';
  currency?: string;
  notes?: string;
  attachmentKeys?: string[];
  lineItems?: ContractLineItemInput[];
  exchangeRate?: number;
  exchangeQuotedAt?: string;
}

export interface UpdateContractRequest {
  vendorName?: string;
  vendorTaxId?: string;
  status?: ContractStatus;
  startsOn?: string;
  endsOn?: string | null;
  autoRenew?: boolean;
  noticeDays?: number | null;
  billingCycle?: 'monthly' | 'yearly' | 'custom';
  chargeType?: 'prepaid' | 'postpaid' | 'on_demand';
  currency?: string;
  notes?: string | null;
  attachmentKeys?: string[];
  lineItems?: ContractLineItemInput[];
  exchangeRate?: number;
  exchangeQuotedAt?: string;
}

export interface GenerateCommitmentsRequest {
  exchangeRate?: number;
  exchangeQuotedAt?: string;
}

export interface ContractListParams {
  renewingBefore?: string;
  status?: ContractStatus | string;
  managedAppId?: string;
}

export interface Contract {
  id: string;
  organizationId: string;
  managedAppId: string;
  vendorName: string | null;
  vendorTaxId: string | null;
  status: string;
  startsOn: string;
  endsOn: string | null;
  autoRenew: boolean;
  noticeDays: number | null;
  billingCycle: string;
  chargeType: string;
  currency: string;
  notes: string | null;
  attachmentKeys: string[];
  createdAt: string;
  updatedAt: string;
  managedApp: { id: string; name: string };
  lineItems: Array<{
    id: string;
    contractId: string;
    name: string;
    skuHint: string | null;
    quantity: number;
    unitAmountMinor: number;
    amountPeriod: string;
    licenseId: string | null;
    provider: string | null;
    allocationMode: string;
    allocationKind: string;
    createdAt: string;
    updatedAt: string;
    allocations: Array<{
      id: string;
      lineItemId: string;
      orgUnitId: string;
      percent: string | null;
      createdAt: string;
    }>;
  }>;
}

export interface ContractSuggestions {
  managedAppId: string;
  managedAppName: string;
  provider: string;
  lineItems: ContractLineItemInput[];
}

export interface GenerateCommitmentsResponse {
  created: number;
  updated: number;
}
