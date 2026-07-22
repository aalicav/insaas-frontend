import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreatePersonAbsenceRequest,
  CreatePersonRequest,
  PeopleListParams,
  Person,
  PersonDetail,
  UpdatePersonAbsenceRequest,
  UpdatePersonRequest,
} from '../models/people.models';

@Injectable({ providedIn: 'root' })
export class PeopleApiService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  list(filters: PeopleListParams = {}): Observable<Person[]> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (typeof value === 'boolean') {
        params = params.set(key, value ? '1' : '0');
        return;
      }
      params = params.set(key, String(value));
    });
    return this.http.get<Person[]>(`${this.api}/people`, { params });
  }

  get(id: string): Observable<PersonDetail> {
    return this.http.get<PersonDetail>(`${this.api}/people/${id}`);
  }

  create(body: CreatePersonRequest): Observable<Person> {
    return this.http.post<Person>(`${this.api}/people`, body);
  }

  update(id: string, body: UpdatePersonRequest): Observable<Person> {
    return this.http.patch<Person>(`${this.api}/people/${id}`, body);
  }

  createAbsence(
    personId: string,
    body: CreatePersonAbsenceRequest,
  ): Observable<PersonDetail> {
    return this.http.post<PersonDetail>(
      `${this.api}/people/${personId}/absences`,
      body,
    );
  }

  updateAbsence(
    personId: string,
    absenceId: string,
    body: UpdatePersonAbsenceRequest,
  ): Observable<PersonDetail> {
    return this.http.patch<PersonDetail>(
      `${this.api}/people/${personId}/absences/${absenceId}`,
      body,
    );
  }

  deleteAbsence(personId: string, absenceId: string): Observable<PersonDetail> {
    return this.http.delete<PersonDetail>(
      `${this.api}/people/${personId}/absences/${absenceId}`,
    );
  }

  reconcile(): Observable<unknown> {
    return this.http.post(`${this.api}/people/reconcile`, {});
  }
}
