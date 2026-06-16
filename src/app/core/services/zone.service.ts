import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PagedResult, ZoneDetailDTO, ZonePairDTO, ZoneSummaryDTO } from '../../models/zone.model';

@Injectable({
    providedIn: 'root'
})
export class ZoneService {
    private readonly apiUrl = `${environment.apiUrl}/zones`;

    constructor(private http: HttpClient) { }

    getAll(): Observable<ZoneSummaryDTO[]> {
        return this.http.get<ZoneSummaryDTO[]>(this.apiUrl);
    }

    getByPostalCode(postalCode: string): Observable<ZoneDetailDTO> {
        return this.http.get<ZoneDetailDTO>(`${this.apiUrl}/${postalCode}`);
    }

    getPair(from: string, to: string): Observable<ZonePairDTO> {
        return this.http.get<ZonePairDTO>(`${this.apiUrl}/pair?from=${from}&to=${to}`);
    }

    getPaged(
        page: number,
        pageSize: number,
        sortBy: string,
        sortOrder: string,
        borough?: string,
        search?: string
    ): Observable<PagedResult<ZoneSummaryDTO>> {
        let params = new HttpParams()
            .set('page', page)
            .set('pageSize', pageSize)
            .set('sortBy', sortBy)
            .set('sortOrder', sortOrder);

        if (borough && borough !== 'All') params = params.set('borough', borough);
        if (search) params = params.set('search', search);

        return this.http.get<PagedResult<ZoneSummaryDTO>>(`${this.apiUrl}/paged`, { params });
    }
}