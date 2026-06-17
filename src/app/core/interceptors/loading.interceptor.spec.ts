import { HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoadingService } from '../services/loading.service';
import { loadingInterceptor } from './loading.interceptor';

describe('loadingInterceptor', () => {
    let loadingServiceMock: { show: ReturnType<typeof vi.fn>; hide: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        loadingServiceMock = {
            show: vi.fn(),
            hide: vi.fn()
        };

        TestBed.configureTestingModule({
            providers: [
                { provide: LoadingService, useValue: loadingServiceMock }
            ]
        });
    });

    it('should call show() when the request starts', () => {
        const req = new HttpRequest('GET', '/api/zones');
        const next: HttpHandlerFn = () => of({} as any);

        TestBed.runInInjectionContext(() => {
            loadingInterceptor(req, next).subscribe();
        });

        expect(loadingServiceMock.show).toHaveBeenCalledOnce();
    });

    it('should call hide() when the request completes successfully', async () => {
        const req = new HttpRequest('GET', '/api/zones');
        const next: HttpHandlerFn = () => of({} as any);

        await TestBed.runInInjectionContext(() =>
            firstValueFrom(loadingInterceptor(req, next))
        );

        expect(loadingServiceMock.hide).toHaveBeenCalledOnce();
    });

    it('should call hide() even when the request fails', async () => {
        const req = new HttpRequest('GET', '/api/zones');
        const mockError = new Error('network failure');
        const next: HttpHandlerFn = () => throwError(() => mockError);

        await TestBed.runInInjectionContext(() =>
            firstValueFrom(loadingInterceptor(req, next)).catch(() => { })
        );

        expect(loadingServiceMock.hide).toHaveBeenCalledOnce();
    });

    it('should call show() before hide()', async () => {
        const req = new HttpRequest('GET', '/api/zones');
        const next: HttpHandlerFn = () => of({} as any);
        const callOrder: string[] = [];

        loadingServiceMock.show.mockImplementation(() => callOrder.push('show'));
        loadingServiceMock.hide.mockImplementation(() => callOrder.push('hide'));

        await TestBed.runInInjectionContext(() =>
            firstValueFrom(loadingInterceptor(req, next))
        );

        expect(callOrder).toEqual(['show', 'hide']);
    });
});