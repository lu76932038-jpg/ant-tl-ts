declare module 'arima' {
    interface ARIMAOptions {
        p?: number;
        d?: number;
        q?: number;
        verbose?: boolean;
    }

    class ARIMA {
        constructor(options?: ARIMAOptions);
        train(data: number[]): void;
        predict(steps: number): [number[], any];
    }

    export default ARIMA;
}
