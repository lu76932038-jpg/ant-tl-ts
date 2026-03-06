import pool from '../config/database';

async function migrate() {
    try {
        console.log('Starting migration: Create UserFavoriteStock table...');

        await pool.execute(`
            CREATE TABLE IF NOT EXISTS UserFavoriteStock (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                sku VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_user_sku (user_id, sku),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (sku) REFERENCES StockList(sku) ON DELETE CASCADE
            )
        `);

        console.log('Migration completed: UserFavoriteStock table created successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
