export interface ZoneSummaryDTO {
    postalCode: string;
    borough: string;
    name: string;
    pickupCount: number;
    dropoffCount: number;
    densityPerKm2: number;
    pickupsByHour: number[];
    dropoffsByHour: number[];
}

export interface ZoneDetailDTO {
    postalCode: string;
    borough: string;
    name: string;
    areaKm2: number;
    pickupCount: number;
    dropoffCount: number;
    avgFare: number;
    avgDistance: number;
    densityPerKm2: number;
    pickupsByHour: number[];
    dropoffsByHour: number[];
    daysInDataset: number;
}

export interface ZonePairDTO {
    pickupZip: string;
    dropoffZip: string;
    tripCount: number;
    avgDuration: number;
}

export interface PagedResult<T> {
    items: T[];
    totalItemCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}