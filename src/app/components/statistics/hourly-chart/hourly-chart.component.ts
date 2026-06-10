import {
    AfterViewInit,
    Component,
    ElementRef,
    Input, OnChanges, ViewChild
} from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
    selector: 'app-hourly-chart',
    standalone: true,
    templateUrl: './hourly-chart.component.html',
    styleUrl: './hourly-chart.component.scss'
})
export class HourlyChartComponent implements AfterViewInit, OnChanges {
    @Input() pickupsByHour: number[] = [];
    @Input() dropoffsByHour: number[] = [];
    @Input() selectedHour = 18;
    @Input() daysInDataset = 31;

    @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

    private chart!: Chart;

    ngAfterViewInit(): void {
        this.initChart();
    }

    ngOnChanges(): void {
        if (this.chart) {
            this.updateChart();
        }
    }

    private getLabels(): string[] {
        return Array.from({ length: 24 }, (_, i) => {
            const suffix = i >= 12 ? 'PM' : 'AM';
            const display = i % 12 === 0 ? 12 : i % 12;
            return `${display}${suffix}`;
        });
    }

    private normalize(values: number[]): number[] {
        return values.map(v => Math.round(v / this.daysInDataset));
    }

    private getBackgroundColors(type: 'pickup' | 'dropoff'): string[] {
        const base = type === 'pickup' ? '79, 142, 247' : '52, 211, 153';
        const active = type === 'pickup' ? '79, 142, 247' : '52, 211, 153';

        return Array.from({ length: 24 }, (_, i) =>
            i === this.selectedHour
                ? `rgba(${active}, 1)`
                : `rgba(${base}, 0.3)`
        );
    }

    private initChart(): void {
        const ctx = this.chartCanvas.nativeElement.getContext('2d')!;

        const config: ChartConfiguration = {
            type: 'bar',
            data: {
                labels: this.getLabels(),
                datasets: [
                    {
                        label: 'Pickups/day',
                        data: this.normalize(this.pickupsByHour),
                        backgroundColor: this.getBackgroundColors('pickup'),
                        borderRadius: 3,
                        borderSkipped: false,
                    },
                    {
                        label: 'Dropoffs/day',
                        data: this.normalize(this.dropoffsByHour),
                        backgroundColor: this.getBackgroundColors('dropoff'),
                        borderRadius: 3,
                        borderSkipped: false,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 200 },
                plugins: {
                    legend: {
                        labels: {
                            color: '#8b92a5',
                            font: { size: 11 },
                            boxWidth: 10,
                            padding: 12
                        }
                    },
                    tooltip: {
                        backgroundColor: '#1e2130',
                        borderColor: '#2a2f45',
                        borderWidth: 1,
                        titleColor: '#f0f2f5',
                        bodyColor: '#8b92a5',
                        padding: 10
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#8b92a5',
                            font: { size: 10 },
                            maxRotation: 0
                        },
                        grid: {
                            color: 'rgba(42, 47, 69, 0.5)'
                        }
                    },
                    y: {
                        ticks: {
                            color: '#8b92a5',
                            font: { size: 10 }
                        },
                        grid: {
                            color: 'rgba(42, 47, 69, 0.5)'
                        }
                    }
                }
            }
        };

        this.chart = new Chart(ctx, config);
    }

    private updateChart(): void {
        if (!this.chart) return;

        this.chart.data.datasets[0].data = this.normalize(this.pickupsByHour);
        this.chart.data.datasets[1].data = this.normalize(this.dropoffsByHour);
        this.chart.data.datasets[0].backgroundColor = this.getBackgroundColors('pickup');
        this.chart.data.datasets[1].backgroundColor = this.getBackgroundColors('dropoff');
        this.chart.update();
    }
}