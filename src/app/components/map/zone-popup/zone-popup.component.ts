import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { ZoneDetailDTO } from '../../../models/zone.model';
import { HourlyChartComponent } from '../../statistics/hourly-chart/hourly-chart.component';

@Component({
    selector: 'app-zone-popup',
    standalone: true,
    imports: [CommonModule, HourlyChartComponent],
    templateUrl: './zone-popup.component.html',
    styleUrl: './zone-popup.component.scss'
})
export class ZonePopupComponent implements OnChanges {
    @Input() zone!: ZoneDetailDTO;
    @Input() selectedHour = 18;
    @Output() close = new EventEmitter<void>();

    pickupsAtHour = 0;
    dropoffsAtHour = 0;
    avgPickupsPerDay = 0;

    ngOnChanges(): void {
        if (!this.zone) return;
        this.pickupsAtHour = Math.round(this.zone.pickupsByHour[this.selectedHour] / this.zone.daysInDataset);
        this.dropoffsAtHour = Math.round(this.zone.dropoffsByHour[this.selectedHour] / this.zone.daysInDataset);
        this.avgPickupsPerDay = Math.round(this.zone.pickupCount / this.zone.daysInDataset);
    }

    get formattedHour(): string {
        const h = this.selectedHour;
        const suffix = h >= 12 ? 'PM' : 'AM';
        const display = h % 12 === 0 ? 12 : h % 12;
        return `${display}:00 ${suffix}`;
    }
}