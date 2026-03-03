import { api } from '../services/api';

export interface CreditExternalData {
    customerId: string;
    lastSyncTime: string; // ISO 8601
    source?: 'cache' | 'live' | 'refreshed'; // 数据来源标识

    // 工商变更
    businessRegistration: {
        status: 'normal' | 'abnormal';
        recentChanges: string;
        registrationNumber: string;
        industry?: string;
        registCapi?: string;
        bizStatus?: string;
    };

    // 司法风险
    judicialRisk: {
        level: 'safe' | 'warning' | 'danger';
        pendingCasesCount: number;
        lawsuitCount?: number;
        isDishonest?: boolean;
        latestCaseSummary: string;
    };

    // 税务评级
    taxRating: {
        grade: 'A' | 'B' | 'M' | 'C' | 'D';
        evaluatedYear: string;
    };
    penaltyAmount?: string;
}

const API_BASE = '/credit-risk';

/**
 * 获取客户外部信用数据（支持多数据源：企查查/天眼查）
 * @param customerCode 客户代码
 * @param source 数据源类型，可选 'qichacha' 或 'tianyancha'
 */
export const fetchQichachaData = async (customerCode: string, source: 'qichacha' | 'tianyancha' = 'qichacha'): Promise<CreditExternalData> => {
    return api.get(`${API_BASE}/external/${encodeURIComponent(customerCode)}`, {
        params: { source }
    }) as Promise<CreditExternalData>;
};

export interface TodoItem {
    label: string;
    color: string;
    type: 'warning' | 'info' | 'critical';
}

export interface CreditDetailData {
    id: number;
    customer_code: string;
    customer_name: string;
    rating: string;
    total_limit: number;
    available_limit: number;
    overdue_amount: number;
    last_evaluation_date: string;
    risk_status: string;

    debt_to_equity?: number;
    revenue_ttm?: number;
    cash_flow?: string;
    // 新增汇总指标
    cooperation_months?: number;
    max_single_trade?: number;
    monthly_sales?: { month: string; amount: number }[];

    todo_list?: TodoItem[];

    created_at?: string;
    updated_at?: string;
}

export const fetchCreditDetail = async (customerCode: string): Promise<CreditDetailData> => {
    return api.get(`${API_BASE}/detail/${encodeURIComponent(customerCode)}`) as Promise<CreditDetailData>;
};

/**
 * 手动强制刷新外部信用数据（跳过缓存直接拉取最新数据）
 * @param customerCode 客户代码
 * @param source 数据源类型，可选 'qichacha' 或 'tianyancha'
 */
export const refreshQichachaData = async (customerCode: string, source: 'qichacha' | 'tianyancha' = 'qichacha'): Promise<CreditExternalData> => {
    return api.post(`${API_BASE}/external/${encodeURIComponent(customerCode)}/refresh`, { source }) as Promise<CreditExternalData>;
};

export interface CreditAiHistory {
    id: number;
    customer_code: string;
    customer_name: string;
    applied_prompt: string;
    reasoning_path: string;
    analysis_result: any;
    created_at: string;
}

export const fetchCreditAiHistory = async (customerCode: string): Promise<CreditAiHistory[]> => {
    return api.get(`${API_BASE}/history/${encodeURIComponent(customerCode)}`) as Promise<CreditAiHistory[]>;
};

/**
 * 实时测试外部数据抓取逻辑 (支持企查查/天眼查)
 */
export const testSub2ApiConnection = async (companyName: string, source: 'qichacha' | 'tianyancha' = 'qichacha'): Promise<any> => {
    return api.post(`${API_BASE}/test-sub2api`, { companyName, source });
};

