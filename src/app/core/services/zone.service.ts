import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ZoneDetailDTO, ZonePairDTO, ZoneSummaryDTO } from '../../models/zone.model';

@Injectable({
    providedIn: 'root'
})
export class ZoneService {
    private readonly apiUrl = 'http://localhost:8080/api/zones';

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
}