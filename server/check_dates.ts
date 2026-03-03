import pool from './src/config/database';

async function check() {
    try {
        const sql = `
            SELECT 
                customer_code,
                MIN(outbound_date) as first_order,
                MAX(outbound_date) as last_order,
                TIMESTAMPDIFF(MONTH, MIN(outbound_date), CURDATE()) as diff_months,
                COUNT(DISTINCT DATE_FORMAT(outbound_date, '%Y-%m')) as active_months
            FROM shiplist
            WHERE customer_code = 'CUST076446'
            GROUP BY customer_code
        `;
        const [rows]: any = await pool.execute(sql);
        console.log("CUST076446 Order stats:", rows[0]);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

check();
