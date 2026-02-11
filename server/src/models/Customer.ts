import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Customer {
    id: number;
    customer_code: string; // Unique Identifier
    customer_name: string;
    created_at?: Date;
    updated_at?: Date;
}

export class CustomerModel {
    static async findAll(): Promise<Customer[]> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            'SELECT * FROM CustomerList ORDER BY created_at DESC'
        );
        return rows as Customer[];
    }

    static async findByCode(code: string): Promise<Customer | null> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            'SELECT * FROM CustomerList WHERE customer_code = ?',
            [code]
        );
        return (rows.length > 0 ? rows[0] : null) as Customer | null;
    }

    static async create(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
        const [result] = await pool.execute<ResultSetHeader>(
            'INSERT INTO CustomerList (customer_code, customer_name) VALUES (?, ?)',
            [customer.customer_code, customer.customer_name]
        );
        return result.insertId;
    }

    static async upsert(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
        const sql = `
            INSERT INTO CustomerList (customer_code, customer_name) 
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE
                customer_name = VALUES(customer_name)
        `;
        await pool.execute(sql, [customer.customer_code, customer.customer_name]);
    }

    static async initializeTable(): Promise<void> {
        try {
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS CustomerList (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    customer_code VARCHAR(100) NOT NULL UNIQUE,
                    customer_name VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
            console.log('CustomerList table created/verified successfully');
        } catch (error) {
            console.error('Error initializing CustomerList table:', error);
            throw error;
        }
    }
}
