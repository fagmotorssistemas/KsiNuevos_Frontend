import { TextFormatter } from "./TextFormatter";

export class DateFormatter {
    constructor(private textFormatter: TextFormatter) {}

    private static rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

    public formatRelativeTime(dateString: string | null | undefined): string {
        if (!dateString) return "N/A";

        const date = new Date(dateString);
        
        if (isNaN(date.getTime())) return "Fecha no disponible";

        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        const units: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
            { unit: 'year',   seconds: 31536000 },
            { unit: 'month',  seconds: 2592000 },
            { unit: 'week',   seconds: 604800 },
            { unit: 'day',    seconds: 86400 },
            { unit: 'hour',   seconds: 3600 },
            { unit: 'minute', seconds: 60 },
            { unit: 'second', seconds: 1 }
        ];

        for (const { unit, seconds } of units) {
            if (Math.abs(diffInSeconds) >= seconds || unit === 'second') {
                const value = -Math.floor(diffInSeconds / seconds);
                const formatted = DateFormatter.rtf.format(value, unit);
                return this.textFormatter.capitalize(formatted);
            }
        }

        return "Reciente";
    }
}