export type SpendKind = 'contract_commitment' | 'invoice' | 'card' | 'adjustment';

export interface SpendListParams {
  competenceFrom?: string;
  competenceTo?: string;
  kind?: SpendKind;
  contractId?: string;
}

export interface CreateSpendEntryRequest {
  kind: 'invoice' | 'card' | 'adjustment';
  managedAppId?: string;
  contractId?: string;
  lineItemId?: string;
  currency: string;
  amountMinor: number;
  competenceOn: string;
  paidOn?: string;
  externalRef?: string;
  exchangeRate?: number;
  exchangeQuotedAt?: string;
  taxComponents?: Array<{ code: 'IOF' | 'IRRF' | 'ISS' | 'OTHER'; amountMinor: number }>;
  allocations?: Array<{ orgUnitId: string; percent?: number }>;
}

export interface SpendEntry {
  id: string;
  organizationId: string;
  managedAppId: string | null;
  contractId: string | null;
  lineItemId: string | null;
  kind: SpendKind;
  currency: string;
  amountMinor: number;
  brlAmountMinor: number;
  exchangeRateQuoteId: string | null;
  taxComponents: unknown | null;
  competenceOn: string;
  paidOn: string | null;
  externalRef: string | null;
  createdAt: string;
  updatedAt: string;
  allocations: Array<{
    id: string;
    organizationId: string;
    spendEntryId: string;
    orgUnitId: string | null;
    amountMinor: number;
    brlAmountMinor: number;
    basis: string | null;
    createdAt: string;
  }>;
}
