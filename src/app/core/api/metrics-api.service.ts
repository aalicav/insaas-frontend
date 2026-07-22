import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  LicenseMetricResponse,
  LicenseSeriesPoint,
  PeopleByUnitResponse,
  PeopleByUnitRow,
  SpendMetricResponse,
  WasteMetricResponse,
} from '../models/metrics.models';

@Injectable({ providedIn: 'root' })
export class MetricsApiService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  licenses(opts: {
    from?: string;
    to?: string;
    connectionId?: string;
    provider?: string;
  } = {}): Observable<LicenseMetricResponse> {
    let params = new HttpParams();
    if (opts.from) params = params.set('from', opts.from);
    if (opts.to) params = params.set('to', opts.to);
    if (opts.connectionId) params = params.set('connectionId', opts.connectionId);
    if (opts.provider) params = params.set('provider', opts.provider);
    return this.http.get<LicenseMetricResponse>(`${this.api}/metrics/licenses`, {
      params,
    });
  }

  /** Daily aggregated series for charts / KPIs. */
  licenseSeries(opts: {
    from?: string;
    to?: string;
    connectionId?: string;
    provider?: string;
  } = {}): Observable<LicenseSeriesPoint[]> {
    return this.licenses(opts).pipe(map((r) => r.series ?? []));
  }

  spend(opts: {
    from?: string;
    to?: string;
    dimension?: string;
  } = {}): Observable<SpendMetricResponse> {
    let params = new HttpParams();
    if (opts.from) params = params.set('from', opts.from);
    if (opts.to) params = params.set('to', opts.to);
    if (opts.dimension) params = params.set('dimension', opts.dimension);
    return this.http.get<SpendMetricResponse>(`${this.api}/metrics/spend`, {
      params,
    });
  }

  peopleByUnit(dimension?: string): Observable<PeopleByUnitResponse> {
    let params = new HttpParams();
    if (dimension) params = params.set('dimension', dimension);
    return this.http.get<PeopleByUnitResponse>(
      `${this.api}/metrics/people-by-unit`,
      { params },
    );
  }

  /** Flat rows for widgets that only need the distribution list. */
  peopleByUnitRows(dimension?: string): Observable<PeopleByUnitRow[]> {
    return this.peopleByUnit(dimension).pipe(map((r) => r.byOrgUnit ?? []));
  }

  waste(): Observable<WasteMetricResponse> {
    return this.http.get<WasteMetricResponse>(`${this.api}/metrics/waste`);
  }
}
