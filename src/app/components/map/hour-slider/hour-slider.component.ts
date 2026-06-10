import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-hour-slider',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './hour-slider.component.html',
    styleUrl: './hour-slider.component.scss'
})
export class HourSliderComponent {
    @Input() selectedHour = 18;
    @Output() hourChange = new EventEmitter<number>();

    get formattedHour(): string {
        const h = this.selectedHour;
        const suffix = h >= 12 ? 'PM' : 'AM';
        const display = h % 12 === 0 ? 12 : h % 12;
        return `${display}:00 ${suffix}`;
    }

    onSliderChange(event: Event): void {
        const value = +(event.target as HTMLInputElement).value;
        this.hourChange.emit(value);
    }

    prev(): void {
        if (this.selectedHour > 0) {
            this.hourChange.emit(this.selectedHour - 1);
        }
    }

    next(): void {
        if (this.selectedHour < 23) {
            this.hourChange.emit(this.selectedHour + 1);
        }
    }
}