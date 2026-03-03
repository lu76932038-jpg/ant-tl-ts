import pool from './server/src/config/database';

async function testUpsert() {
    const risk = {
        customer_code: 'CUST050612',
        rating: 'D',
        total_limit: 0,
        available_limit: 0,
        last_evaluation_date: '2026-03-01',
        risk_status: 'High'
    };

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

    try {
        await pool.execute(sql, [
            risk.customer_code,
            risk.rating || 'B',
            risk.total_limit || 0,
            risk.available_limit || 0,
            (risk as any).overdue_amount || 0,
            risk.last_evaluation_date || null,
            risk.risk_status || 'Low',
            (risk as any).debt_to_equity || 0,
            (risk as any).revenue_ttm || 0,
            (risk as any).cash_flow || null
        ]);
        console.log("Upsert succeeded");
    } catch (err: any) {
        console.error("Upsert failed:", err.message);
    } finally {
        await pool.end();
    }
}

testUpsert();
