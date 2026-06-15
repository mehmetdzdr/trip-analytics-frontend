import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class LoadingService {
    private loadingCount = 0;
    private loading$ = new BehaviorSubject<boolean>(false);

    isLoading$ = this.loading$.asObservable();

    show(): void {
        this.loadingCount++;
        this.loading$.next(true);
    }

    hide(): void {
        this.loadingCount = Math.max(0, this.loadingCount - 1);
        if (this.loadingCount === 0) {
            this.loading$.next(false);
        }
    }
}