export class DateFormatter {

    private static rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

    private static capitalize(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    static formatRelativeTime(dateString: string | null | undefined): string {
        if (!dateString) return "N/A";
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
            let formatted: string;
            if (diffInSeconds < 60) formatted = this.rtf.format(-Math.floor(diffInSeconds), 'second');
            else if (diffInSeconds < 3600) formatted = this.rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
            else if (diffInSeconds < 86400) formatted = this.rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
            else if (diffInSeconds < 604800) formatted = this.rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
            else if (diffInSeconds < 2592000) formatted = this.rtf.format(-Math.floor(diffInSeconds / 604800), 'week');
            else if (diffInSeconds < 31536000) formatted = this.rtf.format(-Math.floor(diffInSeconds / 2592000), 'month');
            else formatted = this.rtf.format(-Math.floor(diffInSeconds / 31536000), 'year');
            return this.capitalize(formatted);
        } catch {
            return "Fecha no disponible";
        }
    }
}