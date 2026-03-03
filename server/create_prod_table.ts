import mysql from 'mysql2/promise';

async function createTable() {
    const pool = mysql.createPool({
        host: '172.16.30.42',
        user: 'ant_tool_user',
        password: '001003009',
        database: 'ant_tool_prod',
        port: 3306
    });

    try {
        const sql = `
            CREATE TABLE IF NOT EXISTS \`customerlist\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`customer_code\` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
                \`customer_name\` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
                \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`customer_code\` (\`customer_code\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
        `;
        const [result] = await pool.query(sql);
        console.log("Table created successfully:", result);
    } catch (error) {
        console.error("Failed to create table:", error);
    } finally {
        process.exit(0);
    }
}
createTable();
