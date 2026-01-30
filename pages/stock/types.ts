
export interface KPI {
    inStock: number;
    inTransit: number;
    sales30Days: number;
    forecast30Days?: number;
    inventoryValue?: number;
    valuationDetails?: {
        date: string;
        qty: number;
        price: number;
        type: 'HISTORY' | 'FALLBACK';
    }[];
    turnoverDays: number;
    stockoutRisk: string;
    inTransitBatches?: {
        id: string;
        arrival_date: string;
        quantity: number;
        isOverdue: boolean;
        overdueDays: number;
    }[];
    dailyActuals?: { date: string, qty: number }[];
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
    daily_forecasts?: { date: string, quantity: number }[];
}

export interface StrategyConfig {
    safety_stock_days: number; // 这将映射为“备货覆盖时长”
    buffer_days: number;       // 新增：安全库存天数(缓冲)
    replenishment_sales_cycle: number; // 新增：补货销售周期 (月)
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
    replenishment_mode?: 'fast' | 'economic';
    supplier_info?: SupplierInfo;
    // 补货设置相关字段 (V3.0.1 任务11)
    auto_replenishment?: boolean; // 是否自动补货
    auto_replenishment_time?: string; // 自动补货时间 (HH:mm 格式)

    // V3.0.1 任务55 & 57
    dead_stock_days?: number; // 呆滞判定天数
    is_stocking_enabled?: boolean; // 是否开启备货

    // V3.0.1 任务48: 数据权限白名单 (User IDs)
    authorized_viewer_ids?: number[];
}

export interface PriceTier {
    minQty: number;      // 最小订购量
    price: number;       // 单价
    leadTime: number;    // 交期(天)
    isSelected?: boolean; // 是否当前备货选择 (任务23)
}

export interface SupplierInfo {
    name: string;
    code: string;
    rating: number;
    price: number;
    // V3.0.1 任务8: 支持的交付模式
    deliveryModes?: ('fast' | 'economic')[];
    leadTimeFast?: number;  // 快速模式交期(天)
    leadTimeEconomic?: number; // 经济模式交期(天)
    // V3.0.1 任务17: 阶梯价格
    priceTiers?: PriceTier[];
    // V3.0.1: 订货配置
    minOrderQty?: number;  // 最小起订量 (MOQ)
    orderUnitQty?: number; // 订货单位量
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
        unit?: string;
    };
    kpi: KPI;
    charts: ChartData[];
}
