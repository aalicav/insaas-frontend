import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Notification,
  NotificationsListParams,
  NotificationsListResponse,
  ReadAllResponse,
  UnreadCountResponse,
} from '../models/notifications.models';

@Injectable({ providedIn: 'root' })
export class NotificationsApiService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiBaseUrl}/notifications`;

  list(filters: NotificationsListParams = {}): Observable<NotificationsListResponse> {
    let params = new HttpParams();
    if (filters.unread !== undefined) {
      params = params.set('unread', filters.unread ? '1' : '0');
    }
    if (filters.limit !== undefined) params = params.set('limit', String(filters.limit));
    if (filters.skip !== undefined) params = params.set('skip', String(filters.skip));
    return this.http.get<NotificationsListResponse>(this.api, { params });
  }

  unreadCount(): Observable<UnreadCountResponse> {
    return this.http.get<UnreadCountResponse>(`${this.api}/unread-count`);
  }

  markRead(id: string): Observable<Notification> {
    return this.http.post<Notification>(`${this.api}/${id}/read`, {});
  }

  markAllRead(): Observable<ReadAllResponse> {
    return this.http.post<ReadAllResponse>(`${this.api}/read-all`, {});
  }
}
