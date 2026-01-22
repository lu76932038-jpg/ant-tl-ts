export class Logger {
    private static getLocalTime(): string {
        const now = new Date();
        const offset = 8 * 60 * 60 * 1000; // UTC+8
        const localDate = new Date(now.getTime() + offset);
        return localDate.toISOString().replace('T', ' ').replace('Z', '').split('.')[0];
    }

    static info(message: string, ...args: any[]) {
        console.log(`[${this.getLocalTime()}] [INFO] ${message}`, ...args);
    }

    static error(message: string, ...args: any[]) {
        console.error(`[${this.getLocalTime()}] [ERROR] ${message}`, ...args);
    }

    static warn(message: string, ...args: any[]) {
        console.warn(`[${this.getLocalTime()}] [WARN] ${message}`, ...args);
    }

    static debug(message: string, ...args: any[]) {
        console.log(`[${this.getLocalTime()}] [DEBUG] ${message}`, ...args);
    }
}
