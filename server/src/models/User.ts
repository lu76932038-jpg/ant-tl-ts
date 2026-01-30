import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import bcrypt from 'bcrypt';

export interface User {
    id: number;
    username: string;
    email: string;
    phone?: string | null;
    password: string;
    raw_password?: string;
    role: 'user' | 'admin';
    permissions: string[];
    created_at: Date;
    updated_at: Date;
    last_login: Date | null;
    is_active: boolean;
}

export interface UserCreateInput {
    username: string;
    email: string;
    phone?: string;
    password: string;
    role?: 'user' | 'admin';
    permissions?: string[];
}

export class UserModel {
    static async create(userData: UserCreateInput): Promise<User> {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const permissionsJson = userData.permissions ? JSON.stringify(userData.permissions) : null;

        const [result] = await pool.execute<ResultSetHeader>(
            'INSERT INTO users (username, email, phone, password, raw_password, role, permissions) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userData.username, userData.email, userData.phone || null, hashedPassword, userData.password, userData.role || 'user', permissionsJson]
        );

        const newUser = await this.findById(result.insertId);
        if (!newUser) {
            throw new Error('User creation failed');
        }
        return newUser;
    }

    private static parsePermissions(permissions: any): string[] {
        if (!permissions) return [];
        if (Array.isArray(permissions)) return permissions;
        try {
            return typeof permissions === 'string' ? JSON.parse(permissions) : [];
        } catch {
            return [];
        }
    }

    static async findByUsername(username: string): Promise<User | null> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        if (rows.length === 0) return null;
        const user = rows[0] as User;
        user.permissions = this.parsePermissions(user.permissions);
        return user;
    }

    static async findByEmail(email: string): Promise<User | null> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        if (rows.length === 0) return null;
        const user = rows[0] as User;
        user.permissions = this.parsePermissions(user.permissions);
        return user;
    }

    static async findByPhone(phone: string): Promise<User | null> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            'SELECT * FROM users WHERE phone = ?',
            [phone]
        );
        if (rows.length === 0) return null;
        const user = rows[0] as User;
        user.permissions = this.parsePermissions(user.permissions);
        return user;
    }

    static async findById(id: number): Promise<User | null> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            'SELECT * FROM users WHERE id = ?',
            [id]
        );
        if (rows.length === 0) return null;
        const user = rows[0] as User;
        user.permissions = this.parsePermissions(user.permissions);
        return user;
    }

    static async count(): Promise<number> {
        const [rows] = await pool.execute<RowDataPacket[]>('SELECT COUNT(*) as count FROM users');
        return rows[0].count;
    }

    static async findAll(): Promise<any[]> {
        const [rows] = await pool.execute<RowDataPacket[]>(
            'SELECT id, username, email, phone, role, permissions, raw_password, created_at, updated_at, last_login, is_active FROM users ORDER BY created_at DESC'
        );
        return rows.map(user => ({
            ...user,
            permissions: this.parsePermissions(user.permissions)
        }));
    }

    static async updateLastLogin(id: number): Promise<void> {
        await pool.execute(
            'UPDATE users SET last_login = NOW() WHERE id = ?',
            [id]
        );
    }

    static async validatePassword(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }

    static async updatePassword(id: number, newPassword: string): Promise<void> {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.execute(
            'UPDATE users SET password = ?, raw_password = ? WHERE id = ?',
            [hashedPassword, newPassword, id]
        );
    }

    static async update(id: number, updates: Partial<User> & { password?: string }): Promise<void> {
        const fields = [];
        const values = [];

        if (updates.username) {
            fields.push('username = ?');
            values.push(updates.username);
        }
        if (updates.email) {
            fields.push('email = ?');
            values.push(updates.email);
        }
        if (updates.phone !== undefined) {
            fields.push('phone = ?');
            values.push(updates.phone);
        }
        if (updates.password) {
            fields.push('password = ?');
            const hashedPassword = await bcrypt.hash(updates.password, 10);
            values.push(hashedPassword);

            fields.push('raw_password = ?');
            values.push(updates.password);
        }
        if (updates.role) {
            fields.push('role = ?');
            values.push(updates.role);
        }
        if (updates.permissions) {
            fields.push('permissions = ?');
            values.push(JSON.stringify(updates.permissions));
        }

        if (fields.length === 0) return;

        values.push(id);

        await pool.execute(
            `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
            values
        );
    }

    static async delete(id: number): Promise<void> {
        await pool.execute('DELETE FROM users WHERE id = ?', [id]);
    }

    static async initializeTable(): Promise<void> {
        try {
            // Check if table exists
            const [tables] = await pool.execute<RowDataPacket[]>(
                "SHOW TABLES LIKE 'users'"
            );

            if (tables.length === 0) {
                await pool.execute(`
                    CREATE TABLE IF NOT EXISTS users (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        username VARCHAR(255) NOT NULL UNIQUE,
                        email VARCHAR(255) NOT NULL UNIQUE,
                        phone VARCHAR(20) UNIQUE DEFAULT NULL,
                        password VARCHAR(255) NOT NULL,
                        raw_password VARCHAR(255),
                        role ENUM('user', 'admin') DEFAULT 'user',
                        permissions JSON DEFAULT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        last_login TIMESTAMP NULL,
                        is_active BOOLEAN DEFAULT TRUE
                    )
                `);
                console.log('Users table created successfully');

                const adminPass = 'admin123';
                const hashedPassword = await bcrypt.hash(adminPass, 10);
                await pool.execute(
                    'INSERT INTO users (username, email, password, raw_password, role, permissions) VALUES (?, ?, ?, ?, ?, ?)',
                    ['admin', 'admin@example.com', hashedPassword, adminPass, 'admin', JSON.stringify([])]
                );
                console.log('Default admin user created');
            } else {
                // Table exists, check for 'phone' column
                const [columns] = await pool.execute<RowDataPacket[]>(
                    "SHOW COLUMNS FROM users LIKE 'phone'"
                );
                if (columns.length === 0) {
                    await pool.execute(
                        "ALTER TABLE users ADD COLUMN phone VARCHAR(20) UNIQUE DEFAULT NULL AFTER email"
                    );
                }

                // Check for 'raw_password' column
                const [rawPassColumns] = await pool.execute<RowDataPacket[]>(
                    "SHOW COLUMNS FROM users LIKE 'raw_password'"
                );
                if (rawPassColumns.length === 0) {
                    await pool.execute(
                        "ALTER TABLE users ADD COLUMN raw_password VARCHAR(255) AFTER password"
                    );
                }

                // 确保旧有的 admin 账户显示 (移出 if 块以便在任何时候修复 NULL 值)
                await pool.execute(
                    "UPDATE users SET raw_password = 'admin123' WHERE username = 'admin' AND raw_password IS NULL"
                );
            }
        } catch (error) {
            console.error('Error initializing users table:', error);
        }
    }
    static async findStockNotificationRecipients(): Promise<string[]> {
        const users = await this.findAll(); // Reuse findAll which handles JSON parsing
        const recipients = users
            .filter(u => u.role === 'admin' || (u.permissions && u.permissions.includes('stock_list')))
            .map(u => u.email)
            .filter(email => !!email); // Ensure no nulls
        return [...new Set(recipients)]; // De-duplicate
    }
}

