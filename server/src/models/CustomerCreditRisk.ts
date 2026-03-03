
import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { CreditExternalData } from '../services/QichachaService';

export interface CustomerCreditRisk {
    id: number;
    customer_code: string;
    rating: string;
    total_limit: number;
    available_limit: number;
    overdue_amount: number;
    last_evaluation_date: string;
    risk_status: string;
    created_at?: Date;
    updated_at?: Date;
    // 联合查询时可能包含客户名称
    customer_name?: string;
    // 企查查外部数据缓存字段
    external_sync_time?: Date;
    biz_status?: string;
    biz_changes?: string;
    biz_reg_no?: string;
    judicial_level?: string;
    judicial_cases?: number;
    tax_grade?: string;
    tax_year?: string;
    // 新增外部征信字段
    industry?: string;
    regist_capi?: string;
    biz_detailed_status?: string;
    judicial_lawsuit_count?: number;
    is_dishonest?: boolean;
    penalty_amount?: string;
    // 财务指标字段
    debt_to_equity?: number;
    revenue_ttm?: number;
    cash_flow?: string;
    cooperation_months?: number;
    max_single_trade?: number;
}

export interface CreditAiHistory {
    id: number;
    customer_code: string;
    customer_name: string;
    applied_prompt: string;
    reasoning_path: string;
    analysis_result: any;
    created_at: Date;
}

export class CustomerCreditRiskModel {
    static async findAllWithCustomerInfo(): Promise<CustomerCreditRisk[]> {
        const sql = `
            SELECT 
                r.*,
                c.customer_name
            FROM customer_credit_risk r
            JOIN customerlist c ON r.customer_code = c.customer_code
            ORDER BY r.updated_at DESC
        `;
        const [rows] = await pool.execute<RowDataPacket[]>(sql);
        return rows as CustomerCreditRisk[];
    }

    static async findByCustomerCode(code: string): Promise<CustomerCreditRisk | null> {
        const sql = `
            SELECT 
                c.customer_name,
                c.customer_code,
                r.id,
                IFNULL(r.rating, 'B') as rating,
                IFNULL(r.total_limit, 0) as total_limit,
                IFNULL(r.available_limit, 0) as available_limit,
                IFNULL(r.overdue_amount, 0) as overdue_amount,
                r.last_evaluation_date,
                IFNULL(r.risk_status, 'Low') as risk_status,
                r.debt_to_equity,
                r.revenue_ttm,
                r.cooperation_months,
                r.max_single_trade,
                r.cash_flow,
                r.external_sync_time,
                r.created_at,
                r.updated_at,
                h.analysis_result as latest_ai_result
            FROM customerlist c
            LEFT JOIN customer_credit_risk r ON c.customer_code = r.customer_code
            LEFT JOIN (
                SELECT customer_code, analysis_result
                FROM credit_ai_history
                WHERE id IN (
                    SELECT MAX(id) FROM credit_ai_history GROUP BY customer_code
                )
            ) h ON c.customer_code = h.customer_code
            WHERE c.customer_code = ?
        `;
        const [rows] = await pool.execute<RowDataPacket[]>(sql, [code]);
        if (rows.length === 0) return null;

        const row: any = rows[0];
        if (row.latest_ai_result && typeof row.latest_ai_result === 'string') {
            try {
                row.latest_ai_result = JSON.parse(row.latest_ai_result);
            } catch (e) {
                console.error('Failed to parse AI result JSON', e);
            }
        }

        return row as CustomerCreditRisk;
    }

    static async upsert(risk: Partial<CustomerCreditRisk>): Promise<void> {
        const sql = `
            INSERT INTO customer_credit_risk 
                (customer_code, rating, total_limit, available_limit, overdue_amount, last_evaluation_date, risk_status,
                 debt_to_equity, revenue_ttm, cash_flow)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                rating = VALUES(rating),
                total_limit = VALUES(total_limit),
                available_limit = VALUES(available_limit),
                overdue_amount = VALUES(overdue_amount),
                last_evaluation_date = VALUES(last_evaluation_date),
                risk_status = VALUES(risk_status),
                debt_to_equity = VALUES(debt_to_equity),
                revenue_ttm = VALUES(revenue_ttm),
                cash_flow = VALUES(cash_flow)
        `;
        await pool.execute(sql, [
            risk.customer_code,
            risk.rating || 'B',
            risk.total_limit || 0,
            risk.available_limit || 0,
            risk.overdue_amount || 0,
            risk.last_evaluation_date || null,
            risk.risk_status || 'Low',
            risk.debt_to_equity || 0,
            risk.revenue_ttm || 0,
            risk.cash_flow || null
        ]);
    }

    static async getUnassignedCustomers(search?: string): Promise<{ customer_code: string, customer_name: string }[]> {
        let sql = `
            SELECT c.customer_code, c.customer_name
            FROM customerlist c
            LEFT JOIN customer_credit_risk r ON c.customer_code = r.customer_code
            WHERE r.customer_code IS NULL
        `;
        const params: any[] = [];

        if (search) {
            sql += ` AND (c.customer_name LIKE ? OR c.customer_code LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        sql += ` ORDER BY c.customer_code ASC LIMIT 50`;

        const [rows] = await pool.execute<RowDataPacket[]>(sql, params);
        return rows as { customer_code: string, customer_name: string }[];
    }

    static async addCustomers(codes: string[]): Promise<number> {
        if (!codes || codes.length === 0) return 0;

        const placeholders = codes.map(() => '(?, ?, ?, ?, CURDATE(), ?)').join(', ');
        const values: any[] = [];
        codes.forEach(code => {
            values.push(code, 'B', 100000.00, 100000.00, 'Low');
        });

        const sql = `
            INSERT IGNORE INTO customer_credit_risk 
                (customer_code, rating, total_limit, available_limit, last_evaluation_date, risk_status)
            VALUES ${placeholders}
        `;

        const [result] = await pool.execute<ResultSetHeader>(sql, values);

        for (const code of codes) {
            await this.recalculateInternalMetrics(code);
        }

        return result.affectedRows;
    }

    static async recalculateInternalMetrics(customerCode: string): Promise<void> {
        const statsSql = `
            SELECT 
                SUM(CASE WHEN outbound_date >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR) THEN quantity * unit_price ELSE 0 END) as revenue_ttm,
                TIMESTAMPDIFF(MONTH, MIN(outbound_date), CURDATE()) as cooperation_months,
                MAX(quantity * unit_price) as max_single_trade,
                COUNT(CASE WHEN outbound_date >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR) THEN 1 END) as order_count_ttm
            FROM shiplist 
            WHERE customer_code = ?
        `;
        const [rows] = await pool.execute<RowDataPacket[]>(statsSql, [customerCode]);
        const stats = rows[0];

        if (stats && stats.cooperation_months !== null) {
            const updateSql = `
                UPDATE customer_credit_risk SET
                    revenue_ttm = ?,
                    cooperation_months = ?,
                    max_single_trade = ?
                WHERE customer_code = ?
            `;
            await pool.execute(updateSql, [
                stats.revenue_ttm || 0,
                stats.cooperation_months || 0,
                stats.max_single_trade || 0,
                customerCode
            ]);
        }
    }

    static async syncWithCustomerList(): Promise<number> {
        const sql = `
            INSERT IGNORE INTO customer_credit_risk 
                (customer_code, rating, total_limit, available_limit, last_evaluation_date, risk_status)
            SELECT 
                customer_code, 
                'B', 
                100000.00, 
                100000.00, 
                CURDATE(), 
                'Low'
            FROM customerlist
        `;
        const [result] = await pool.execute<ResultSetHeader>(sql);
        return result.affectedRows;
    }

    static async saveExternalData(customerCode: string, data: CreditExternalData): Promise<void> {
        const sql = `
            UPDATE customer_credit_risk SET
                external_sync_time = NOW(),
                biz_status          = ?,
                biz_changes         = ?,
                biz_reg_no          = ?,
                judicial_level      = ?,
                judicial_cases      = ?,
                judicial_summary    = ?,
                tax_grade           = ?,
                tax_year            = ?,
                industry            = ?,
                regist_capi         = ?,
                biz_detailed_status = ?,
                judicial_lawsuit_count = ?,
                is_dishonest        = ?,
                penalty_amount      = ?
            WHERE customer_code = ?
        `;
        await pool.execute(sql, [
            data.businessRegistration.status,
            data.businessRegistration.recentChanges,
            data.businessRegistration.registrationNumber,
            data.judicialRisk.level,
            data.judicialRisk.pendingCasesCount,
            data.judicialRisk.latestCaseSummary,
            data.taxRating.grade,
            data.taxRating.evaluatedYear,
            data.businessRegistration.industry || null,
            data.businessRegistration.registCapi || null,
            data.businessRegistration.bizStatus || null,
            data.judicialRisk.lawsuitCount || 0,
            data.judicialRisk.isDishonest ? 1 : 0,
            data.penaltyAmount || null,
            customerCode
        ]);
    }

    static async getExternalData(customerCode: string, maxAgeHours = 168): Promise<CreditExternalData | null> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            `SELECT * FROM customer_credit_risk
             WHERE customer_code = ?
               AND external_sync_time IS NOT NULL
               AND external_sync_time >= DATE_SUB(NOW(), INTERVAL ? HOUR)`,
            [customerCode, maxAgeHours]
        );
        if (rows.length === 0) return null;
        const r = rows[0];
        return {
            customerId: customerCode,
            lastSyncTime: (r.external_sync_time as Date).toISOString(),
            taxRating: {
                grade: (r.tax_grade as 'A' | 'B' | 'M' | 'C' | 'D') || 'B',
                evaluatedYear: r.tax_year || ''
            },
            businessRegistration: {
                status: (r.biz_status as 'normal' | 'abnormal') || 'normal',
                recentChanges: r.biz_changes || '',
                registrationNumber: r.biz_reg_no || '',
                industry: r.industry,
                registCapi: r.regist_capi,
                bizStatus: r.biz_detailed_status
            },
            judicialRisk: {
                level: (r.judicial_level as 'safe' | 'warning' | 'danger') || 'safe',
                pendingCasesCount: r.judicial_cases ?? 0,
                lawsuitCount: r.judicial_lawsuit_count,
                isDishonest: !!r.is_dishonest,
                latestCaseSummary: r.judicial_summary || ''
            },
            penaltyAmount: r.penalty_amount
        };
    }

    static async saveAiHistory(data: {
        customer_code: string;
        customer_name: string;
        applied_prompt: string;
        reasoning_path: string;
        analysis_result: any;
    }): Promise<void> {
        const sql = `
            INSERT INTO credit_ai_history
                (customer_code, customer_name, applied_prompt, reasoning_path, analysis_result)
            VALUES (?, ?, ?, ?, ?)
        `;
        await pool.execute(sql, [
            data.customer_code,
            data.customer_name,
            data.applied_prompt,
            data.reasoning_path,
            JSON.stringify(data.analysis_result)
        ]);
    }

    static async getAiHistoryByCode(customerCode: string): Promise<CreditAiHistory[]> {
        const sql = `
            SELECT * FROM credit_ai_history
            WHERE customer_code = ?
            ORDER BY created_at DESC
        `;
        const [rows] = await pool.execute<RowDataPacket[]>(sql, [customerCode]);
        return rows.map((r: any) => ({
            ...r,
            analysis_result: typeof r.analysis_result === 'string' ? JSON.parse(r.analysis_result) : r.analysis_result
        })) as CreditAiHistory[];
    }

    static async getMonthlySalesRolling12Months(customerCode: string): Promise<{ month: string, amount: number }[]> {
        const sql = `
            SELECT 
                DATE_FORMAT(outbound_date, '%Y-%m') as month,
                SUM(quantity * unit_price) as amount
            FROM shiplist
            WHERE customer_code = ? AND outbound_date >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)
            GROUP BY month
            ORDER BY month ASC
        `;
        const [rows] = await pool.execute<RowDataPacket[]>(sql, [customerCode]);
        return rows as { month: string, amount: number }[];
    }

    static async getGlobalStats(): Promise<any> {
        const currentSql = `
            SELECT 
                COUNT(*) as total_customers,
                SUM(CASE WHEN risk_status = 'High' THEN 1 ELSE 0 END) as high_risk_count,
                SUM(total_limit) as total_limit,
                SUM(overdue_amount) as total_overdue,
                AVG(CASE 
                    WHEN rating = 'A+' THEN 950
                    WHEN rating = 'A' THEN 850
                    WHEN rating = 'B' THEN 750
                    WHEN rating = 'C' THEN 650
                    WHEN rating = 'D' THEN 450
                    ELSE 700 
                END) as avg_score
            FROM customer_credit_risk
        `;
        const [currRows] = await pool.execute<RowDataPacket[]>(currentSql);
        const curr = currRows[0];

        const historySql = `
            SELECT * FROM customer_credit_risk_stats_history 
            WHERE snap_date < CURDATE()
            ORDER BY snap_date DESC LIMIT 1
        `;
        const [histRows] = await pool.execute<RowDataPacket[]>(historySql);
        const prev = histRows.length > 0 ? histRows[0] : null;

        const calcTrend = (now: number, old: number | null, isCount = false) => {
            if (old === null || old === 0) return '+0.0%';
            if (isCount) {
                const diff = now - old;
                return (diff >= 0 ? '+' : '') + diff;
            }
            const percent = ((now - old) / old) * 100;
            return (percent >= 0 ? '+' : '') + percent.toFixed(1) + '%';
        };

        const recoveryRate = curr.total_limit > 0
            ? (((curr.total_limit - curr.total_overdue) / curr.total_limit) * 100).toFixed(1) + '%'
            : '100%';

        const prevTotalLimit = prev?.total_limit || 0;
        const prevOverdueAmount = prev?.total_overdue || 0;
        const prevRecoveryRateValue = prevTotalLimit > 0
            ? ((prevTotalLimit - prevOverdueAmount) / prevTotalLimit) * 100
            : 100;

        const currRecoveryRateValue = curr.total_limit > 0
            ? ((curr.total_limit - curr.total_overdue) / curr.total_limit) * 100
            : 100;

        return {
            avgScore: Math.round(curr.avg_score || 0),
            highRiskCount: curr.high_risk_count || 0,
            totalLimit: curr.total_limit || 0,
            recoveryRate: recoveryRate,
            trends: {
                avgScore: calcTrend(curr.avg_score, prev?.avg_score),
                highRiskCount: calcTrend(curr.high_risk_count, prev?.high_risk_count, true),
                totalLimit: calcTrend(curr.total_limit, prev?.total_limit),
                recoveryRate: calcTrend(currRecoveryRateValue, prevRecoveryRateValue)
            }
        };
    }

    static async createDailySnapshot(): Promise<void> {
        const sql = `
            INSERT INTO customer_credit_risk_stats_history 
                (snap_date, avg_score, high_risk_count, total_limit, total_overdue)
            SELECT 
                CURDATE(),
                AVG(CASE 
                    WHEN rating = 'A+' THEN 950
                    WHEN rating = 'A' THEN 850
                    WHEN rating = 'B' THEN 750
                    WHEN rating = 'C' THEN 650
                    WHEN rating = 'D' THEN 450
                    ELSE 700 
                END),
                SUM(CASE WHEN risk_status = 'High' THEN 1 ELSE 0 END),
                SUM(total_limit),
                SUM(overdue_amount)
            FROM customer_credit_risk
            ON DUPLICATE KEY UPDATE
                avg_score = VALUES(avg_score),
                high_risk_count = VALUES(high_risk_count),
                total_limit = VALUES(total_limit),
                total_overdue = VALUES(total_overdue)
        `;
        await pool.execute(sql);
    }

    static async initializeTable(): Promise<void> {
        try {
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS customer_credit_risk (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    customer_code VARCHAR(100) NOT NULL UNIQUE,
                    rating VARCHAR(10) DEFAULT 'B',
                    total_limit DECIMAL(15, 2) DEFAULT 0.00,
                    available_limit DECIMAL(15, 2) DEFAULT 0.00,
                    overdue_amount DECIMAL(15, 2) DEFAULT 0.00,
                    last_evaluation_date DATE,
                    risk_status VARCHAR(20) DEFAULT 'Low',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
            `);

            const addColumn = async (columnName: string, sql: string) => {
                const [columns] = await pool.query<RowDataPacket[]>(`SHOW COLUMNS FROM customer_credit_risk LIKE '${columnName}'`);
                if (columns.length === 0) await pool.execute(sql);
            };

            await addColumn('external_sync_time', 'ALTER TABLE customer_credit_risk ADD COLUMN external_sync_time DATETIME NULL');
            await addColumn('biz_status', 'ALTER TABLE customer_credit_risk ADD COLUMN biz_status VARCHAR(20) NULL');
            await addColumn('biz_changes', 'ALTER TABLE customer_credit_risk ADD COLUMN biz_changes TEXT NULL');
            await addColumn('biz_reg_no', 'ALTER TABLE customer_credit_risk ADD COLUMN biz_reg_no VARCHAR(100) NULL');
            await addColumn('judicial_level', 'ALTER TABLE customer_credit_risk ADD COLUMN judicial_level VARCHAR(20) NULL');
            await addColumn('judicial_cases', 'ALTER TABLE customer_credit_risk ADD COLUMN judicial_cases INT DEFAULT 0');
            await addColumn('judicial_summary', 'ALTER TABLE customer_credit_risk ADD COLUMN judicial_summary TEXT NULL');
            await addColumn('tax_grade', 'ALTER TABLE customer_credit_risk ADD COLUMN tax_grade VARCHAR(5) NULL');
            await addColumn('tax_year', 'ALTER TABLE customer_credit_risk ADD COLUMN tax_year VARCHAR(30) NULL');
            await addColumn('debt_to_equity', 'ALTER TABLE customer_credit_risk ADD COLUMN debt_to_equity DECIMAL(10, 4) DEFAULT 0');
            await addColumn('revenue_ttm', 'ALTER TABLE customer_credit_risk ADD COLUMN revenue_ttm DECIMAL(15, 2) DEFAULT 0');
            await addColumn('cash_flow', 'ALTER TABLE customer_credit_risk ADD COLUMN cash_flow VARCHAR(50) NULL');
            await addColumn('cooperation_months', 'ALTER TABLE customer_credit_risk ADD COLUMN cooperation_months INT DEFAULT 0');
            await addColumn('max_single_trade', 'ALTER TABLE customer_credit_risk ADD COLUMN max_single_trade DECIMAL(15, 2) DEFAULT 0');
            await addColumn('industry', 'ALTER TABLE customer_credit_risk ADD COLUMN industry VARCHAR(100) NULL');
            await addColumn('regist_capi', 'ALTER TABLE customer_credit_risk ADD COLUMN regist_capi VARCHAR(50) NULL');
            await addColumn('biz_detailed_status', 'ALTER TABLE customer_credit_risk ADD COLUMN biz_detailed_status VARCHAR(50) NULL');
            await addColumn('judicial_lawsuit_count', 'ALTER TABLE customer_credit_risk ADD COLUMN judicial_lawsuit_count INT DEFAULT 0');
            await addColumn('is_dishonest', 'ALTER TABLE customer_credit_risk ADD COLUMN is_dishonest TINYINT(1) DEFAULT 0');
            await addColumn('penalty_amount', 'ALTER TABLE customer_credit_risk ADD COLUMN penalty_amount VARCHAR(50) NULL');

            await pool.execute(`
                CREATE TABLE IF NOT EXISTS credit_ai_history (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    customer_code VARCHAR(100) NOT NULL,
                    customer_name VARCHAR(255) NULL,
                    applied_prompt TEXT NULL,
                    reasoning_path TEXT NULL,
                    analysis_result JSON NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_customer_code (customer_code)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
            `);

            await pool.execute(`
                CREATE TABLE IF NOT EXISTS customer_credit_risk_stats_history (
                    snap_date DATE PRIMARY KEY,
                    avg_score DECIMAL(10, 2) DEFAULT 0,
                    high_risk_count INT DEFAULT 0,
                    total_limit DECIMAL(20, 2) DEFAULT 0,
                    total_overdue DECIMAL(20, 2) DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
            `);

        } catch (error) {
            console.error('Error initializing data tables:', error);
            throw error;
        }
    }
}
