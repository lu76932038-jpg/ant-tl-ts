
import pool from './server/src/config/database';

async function initCreditTable() {
    try {
        console.log('Starting credit table initialization...');
        
        // 1. 创建信用风控表
        // 关联 CustomerList 表的 customer_code
        const createTableSql = `
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
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_code) REFERENCES CustomerList(customer_code) ON DELETE CASCADE
            )
        `;
        
        await pool.execute(createTableSql);
        console.log('Table customer_credit_risk created/verified successfully');
        
        // 2. 初始化数据：为所有现有客户创建默认风控记录
        const insertDefaultsSql = `
            INSERT IGNORE INTO customer_credit_risk (customer_code, rating, total_limit, available_limit, last_evaluation_date)
            SELECT customer_code, 'B', 100000.00, 100000.00, CURDATE()
            FROM CustomerList
        `;
        
        const [result]: any = await pool.execute(insertDefaultsSql);
        console.log(`Initialized default credit risk records for ${result.affectedRows} customers`);
        
        process.exit(0);
    } catch (error) {
        console.error('Error initializing credit table:', error);
        process.exit(1);
    }
}

initCreditTable();
