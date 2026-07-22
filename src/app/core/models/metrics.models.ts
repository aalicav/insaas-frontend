/** Aligned with GET /metrics/* backend responses. */

export interface LicenseSeriesPoint {
  day: string;
  seats: number;
  assignedCount: number;
  unusedSeats: number;
  licenses: number;
}

export interface LicenseMetricResponse {
  series: LicenseSeriesPoint[];
  points: Array<{
    day: string;
    licenseId: string;
    connectionId: string;
    provider: string;
    skuId: string | null;
    skuName: string | null;
    seats: number | null;
    assignedCount: number | null;
    unusedSeats: number | null;
  }>;
}

export interface SpendSeriesPoint {
  month: string;
  commitmentBrlMinor: number;
  invoiceBrlMinor: number;
  cardBrlMinor: number;
  adjustmentBrlMinor: number;
  totalBrlMinor: number;
}

export interface SpendByOrgUnit {
  orgUnitId: string | null;
  name: string;
  kind: string | null;
  code: string | null;
  brlAmountMinor: number;
}

export interface SpendMetricResponse {
  dimension: string;
  series: SpendSeriesPoint[];
  byOrgUnit: SpendByOrgUnit[];
}

export interface PeopleByUnitRow {
  orgUnitId: string | null;
  name: string;
  code: string | null;
  peopleCount: number;
  ownedAppsCount: number;
}

export interface PeopleByUnitResponse {
  dimension: string;
  byOrgUnit: PeopleByUnitRow[];
}

export interface WasteItem {
  licenseId: string;
  skuName: string | null;
  unusedSeats: number;
  unitBrlMinorPerMonth: number;
  wasteBrlMinor: number;
}

export interface WasteMetricResponse {
  day: string | null;
  items: WasteItem[];
  wasteBrlMinor: number;
}

/** @deprecated alias kept for older imports */
export type LicenseMetricPoint = LicenseSeriesPoint;
/** @deprecated alias */
export type PeopleByUnitMetric = PeopleByUnitRow;
