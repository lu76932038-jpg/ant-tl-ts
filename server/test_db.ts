import pool from './src/config/database';

async function test() {
    try {
        const sql = `
            SELECT 
                MONTH(outbound_date) as month,
                SUM(quantity * unit_price) as amount,
                COUNT(*) as count
            FROM shiplist
            WHERE customer_code = 'CUST076446' AND YEAR(outbound_date) = YEAR(CURDATE())
            GROUP BY MONTH(outbound_date)
            ORDER BY month ASC
        `;
        const [rows] = await pool.execute(sql);
        console.log("Current Year Sales Data for CUST076446:", rows);

        const sql2 = `
            SELECT 
                MONTH(outbound_date) as month,
                SUM(quantity * unit_price) as amount,
                COUNT(*) as count
            FROM shiplist
            WHERE customer_code = 'CUST067362' AND YEAR(outbound_date) = YEAR(CURDATE())
            GROUP BY MONTH(outbound_date)
            ORDER BY month ASC
        `;
        const [rows2] = await pool.execute(sql2);
        console.log("Current Year Sales Data for CUST067362:", rows2);

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

test();
