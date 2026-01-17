
export interface KPI {
    inStock: number;
    inTransit: number;
    sales30Days: number;
    turnoverDays: number;
    stockoutRisk: string;
    inTransitBatches?: {
        id: string;
        arrival_date: string;
        quantity: number;
        isOverdue: boolean;
        overdueDays: number;
    }[];
}

export interface ChartData {
    month: string;
    fullDate: string;
    type: string;
    actualQty?: number;
    actualAmount?: number;
    actualCustomerCount?: number;
    forecastQty?: number;
    forecastAmount?: number;
    forecastCustomerCount?: number;
    forecastRemainder?: number; // Added this one as it was used in calculation
    inbound?: number;
    outbound?: number;
    simStock: number;
    simRop: number;
    simSafety: number;
}

export interface StrategyConfig {
    safety_stock_days: number;
    rop: number;
    eoq: number;
    start_year_month?: string;
    forecast_year_month?: string;
    // Add other fields used in the component
    benchmark_type?: 'mom' | 'yoy';
    mom_range?: number;
    mom_time_sliders?: number[];
    mom_weight_sliders?: number[];
    yoy_range?: number;
    yoy_weight_sliders?: number[];
    ratio_adjustment?: number;
    forecast_overrides?: Record<string, number>;
    calculated_forecasts?: Record<string, number>;
}

export interface SupplierInfo {
    name: string;
    code: string;
    rating: number;
    price: number;
}

export interface AuditLog {
    id: string | number;
    action_type: string;
    content: string;
    created_at: string;
    status: string;
}

export interface ProductDetailData {
    basic: {
        sku: string;
        name: string;
        status: string;
    };
    kpi: KPI;
    charts: ChartData[];
}
