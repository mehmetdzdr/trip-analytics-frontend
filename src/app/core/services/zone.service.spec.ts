import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { PagedResult, ZoneDetailDTO, ZonePairDTO, ZoneSummaryDTO } from '../../models/zone.model';
import { ZoneService } from './zone.service';

describe('ZoneService', () => {
    let service: ZoneService;
    let httpMock: HttpTestingController;
    const apiUrl = `${environment.apiUrl}/zones`;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                ZoneService,
                provideHttpClient(),
                provideHttpClientTesting()
            ]
        });

        service = TestBed.inject(ZoneService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    describe('getAll', () => {
        it('should send a GET request to the correct URL and return zones', () => {
            const mockZones: ZoneSummaryDTO[] = [
                {
                    postalCode: '10001',
                    borough: 'Manhattan',
                    name: 'Chelsea',
                    pickupCount: 100,
                    dropoffCount: 80,
                    densityPerKm2: 50.5,
                    pickupsByHour: new Array(24).fill(0),
                    dropoffsByHour: new Array(24).fill(0)
                }
            ];

            service.getAll().subscribe(result => {
                expect(result).toEqual(mockZones);
            });

            const req = httpMock.expectOne(apiUrl);
            expect(req.request.method).toBe('GET');
            req.flush(mockZones);
        });
    });

    describe('getByPostalCode', () => {
        it('should send a GET request to the correct URL with postal code', () => {
            const mockZone: ZoneDetailDTO = {
                postalCode: '10001',
                borough: 'Manhattan',
                name: 'Chelsea',
                areaKm2: 5.0,
                pickupCount: 100,
                dropoffCount: 80,
                avgFare: 12.5,
                avgDistance: 2.3,
                densityPerKm2: 50.5,
                pickupsByHour: new Array(24).fill(0),
                dropoffsByHour: new Array(24).fill(0),
                daysInDataset: 31
            };

            service.getByPostalCode('10001').subscribe(result => {
                expect(result).toEqual(mockZone);
            });

            const req = httpMock.expectOne(`${apiUrl}/10001`);
            expect(req.request.method).toBe('GET');
            req.flush(mockZone);
        });
    });

    describe('getPair', () => {
        it('should send a GET request with from and to query params', () => {
            const mockPair: ZonePairDTO = {
                pickupZip: '10001',
                dropoffZip: '10002',
                tripCount: 42,
                avgDuration: 15.5
            };

            service.getPair('10001', '10002').subscribe(result => {
                expect(result).toEqual(mockPair);
            });

            const req = httpMock.expectOne(`${apiUrl}/pair?from=10001&to=10002`);
            expect(req.request.method).toBe('GET');
            req.flush(mockPair);
        });
    });

    describe('getPaged', () => {
        const mockPagedResult: PagedResult<ZoneSummaryDTO> = {
            items: [],
            totalItemCount: 0,
            page: 1,
            pageSize: 10,
            totalPages: 0
        };

        it('should always include page, pageSize, sortBy, and sortOrder params', () => {
            service.getPaged(1, 10, 'pickupCount', 'desc').subscribe();

            const req = httpMock.expectOne(req =>
                req.url === `${apiUrl}/paged` &&
                req.params.get('page') === '1' &&
                req.params.get('pageSize') === '10' &&
                req.params.get('sortBy') === 'pickupCount' &&
                req.params.get('sortOrder') === 'desc'
            );
            expect(req.request.method).toBe('GET');
            req.flush(mockPagedResult);
        });

        it('should not include borough param when borough is undefined', () => {
            service.getPaged(1, 10, 'pickupCount', 'desc').subscribe();

            const req = httpMock.expectOne(`${apiUrl}/paged?page=1&pageSize=10&sortBy=pickupCount&sortOrder=desc`);
            expect(req.request.params.has('borough')).toBe(false);
            req.flush(mockPagedResult);
        });

        it('should not include borough param when borough is "All"', () => {
            service.getPaged(1, 10, 'pickupCount', 'desc', 'All').subscribe();

            const req = httpMock.expectOne(req => req.url === `${apiUrl}/paged`);
            expect(req.request.params.has('borough')).toBe(false);
            req.flush(mockPagedResult);
        });

        it('should include borough param when a specific borough is provided', () => {
            service.getPaged(1, 10, 'pickupCount', 'desc', 'Manhattan').subscribe();

            const req = httpMock.expectOne(req => req.url === `${apiUrl}/paged`);
            expect(req.request.params.get('borough')).toBe('Manhattan');
            req.flush(mockPagedResult);
        });

        it('should not include search param when search is not provided', () => {
            service.getPaged(1, 10, 'pickupCount', 'desc').subscribe();

            const req = httpMock.expectOne(req => req.url === `${apiUrl}/paged`);
            expect(req.request.params.has('search')).toBe(false);
            req.flush(mockPagedResult);
        });

        it('should include search param when search is provided', () => {
            service.getPaged(1, 10, 'pickupCount', 'desc', undefined, 'Chelsea').subscribe();

            const req = httpMock.expectOne(req => req.url === `${apiUrl}/paged`);
            expect(req.request.params.get('search')).toBe('Chelsea');
            req.flush(mockPagedResult);
        });
    });
});