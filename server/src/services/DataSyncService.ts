
import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import db from '../config/database'; // Adjust path if needed
import { ShipListModel } from '../models/ShipList';
import { CustomerModel } from '../models/Customer';
import { StockModel, StockStatus } from '../models/Stock';

const LOG_FILE = path.join(process.cwd(), 'data-sync.log');
const INVENTORY_LOG_FILE = path.join(process.cwd(), 'inventory-sync.log');
const INBOUND_LOG_FILE = path.join(process.cwd(), 'inbound-sync.log');

interface SyncConfig {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
    sql?: string;
    schedule?: string[] | string; // Array of HH:mm strings
}

// DB Config Keys
const CONFIG_KEY = 'outbound_data_sync_config';
const INVENTORY_CONFIG_KEY = 'inventory_data_sync_config';
const INBOUND_CONFIG_KEY = 'inbound_data_sync_config';

// 同步超时时间（毫秒），防止卡死永久占锁
const SYNC_TIMEOUT_MS = 120 * 60 * 1000; // 增加到120分钟，适应大数据量同步 (58万条约需1.6h)

export class DataSyncService {

    private static isSyncing = false;
    private static isInventorySyncing = false;
    private static isInboundSyncing = false;
    private static syncStartTime: number | null = null;
    private static inventorySyncStartTime: number | null = null;
    private static inboundSyncStartTime: number | null = null;

    public getSyncStatus() {
        // 自动检测超时并释放锁
        if (DataSyncService.isSyncing && DataSyncService.syncStartTime) {
            const elapsed = Date.now() - DataSyncService.syncStartTime;
            if (elapsed > SYNC_TIMEOUT_MS) {
                const msg = `[Outbound][Warn] 同步超时（${Math.round(elapsed / 60000)}分钟），自动释放锁`;
                console.warn(msg);
                this.log(msg, LOG_FILE).catch(() => { });
                DataSyncService.isSyncing = false;
                DataSyncService.syncStartTime = null;
            }
        }
        if (DataSyncService.isInventorySyncing && DataSyncService.inventorySyncStartTime) {
            const elapsed = Date.now() - DataSyncService.inventorySyncStartTime;
            if (elapsed > SYNC_TIMEOUT_MS) {
                const msg = `[Inventory][Warn] 库存同步超时（${Math.round(elapsed / 60000)}分钟），自动释放锁`;
                console.warn(msg);
                this.log(msg, INVENTORY_LOG_FILE).catch(() => { });
                DataSyncService.isInventorySyncing = false;
                DataSyncService.inventorySyncStartTime = null;
            }
        }
        if (DataSyncService.isInboundSyncing && DataSyncService.inboundSyncStartTime) {
            const elapsed = Date.now() - DataSyncService.inboundSyncStartTime;
            if (elapsed > SYNC_TIMEOUT_MS) {
                const msg = `[Inbound][Warn] 入库同步超时（${Math.round(elapsed / 60000)}分钟），自动释放锁`;
                console.warn(msg);
                this.log(msg, INBOUND_LOG_FILE).catch(() => { });
                DataSyncService.isInboundSyncing = false;
                DataSyncService.inboundSyncStartTime = null;
            }
        }
        return {
            isSyncing: DataSyncService.isSyncing,
            isInventorySyncing: DataSyncService.isInventorySyncing,
            isInboundSyncing: DataSyncService.isInboundSyncing
        };
    }

    public forceResetSync() {
        DataSyncService.isSyncing = false;
        DataSyncService.syncStartTime = null;
        DataSyncService.isInventorySyncing = false;
        DataSyncService.inventorySyncStartTime = null;
        DataSyncService.isInboundSyncing = false;
        DataSyncService.inboundSyncStartTime = null;
        return { message: '已强制释放所有同步锁' };
    }

    // --- Configurations ---

    async saveConfig(config: SyncConfig) {
        const configJson = JSON.stringify(config);
        const sql = `INSERT INTO sys_data_sync_config (config_key, config_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE config_value = ?`;
        await db.execute(sql, [CONFIG_KEY, configJson, configJson]);
    }

    async getConfig(): Promise<SyncConfig> {
        try {
            const [rows] = await db.execute("SELECT config_value FROM sys_data_sync_config WHERE config_key = ?", [CONFIG_KEY]) as any[];
            return rows.length > 0 ? JSON.parse(rows[0].config_value) : {};
        } catch (error) {
            return {};
        }
    }

    async saveInventoryConfig(config: SyncConfig) {
        const configJson = JSON.stringify(config);
        const sql = `INSERT INTO sys_data_sync_config (config_key, config_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE config_value = ?`;
        await db.execute(sql, [INVENTORY_CONFIG_KEY, configJson, configJson]);
    }

    async getInventoryConfig(): Promise<SyncConfig> {
        try {
            const [rows] = await db.execute("SELECT config_value FROM sys_data_sync_config WHERE config_key = ?", [INVENTORY_CONFIG_KEY]) as any[];
            return rows.length > 0 ? JSON.parse(rows[0].config_value) : {};
        } catch (error) {
            return {};
        }
    }

    async saveInboundConfig(config: SyncConfig) {
        const configJson = JSON.stringify(config);
        const sql = `INSERT INTO sys_data_sync_config (config_key, config_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE config_value = ?`;
        await db.execute(sql, [INBOUND_CONFIG_KEY, configJson, configJson]);
    }

    async getInboundConfig(): Promise<SyncConfig> {
        try {
            const [rows] = await db.execute("SELECT config_value FROM sys_data_sync_config WHERE config_key = ?", [INBOUND_CONFIG_KEY]) as any[];
            return rows.length > 0 ? JSON.parse(rows[0].config_value) : {};
        } catch (error) {
            return {};
        }
    }

    // --- Methods ---

    async testConnection(config: SyncConfig): Promise<boolean> {
        let connection;
        try {
            connection = await mysql.createConnection({
                host: config.host,
                port: config.port || 3306,
                user: config.user,
                password: config.password,
                database: config.database
            });
            await connection.ping();
            return true;
        } catch (error) {
            throw new Error('Connect failed: ' + (error as Error).message);
        } finally {
            if (connection) await connection.end();
        }
    }

    async executeSqlPreview(config: SyncConfig, mode: 'outbound' | 'inventory' | 'inbound' = 'outbound'): Promise<any> {
        let connection;
        try {
            connection = await mysql.createConnection({
                host: config.host,
                port: config.port || 3306,
                user: config.user,
                password: config.password,
                database: config.database
            });

            let previewSql = config.sql!.trim();
            if (previewSql.endsWith(';')) previewSql = previewSql.slice(0, -1);
            previewSql = `SELECT * FROM (${previewSql}) AS tmp LIMIT 5`;

            const [rows]: [any[], any] = await connection.execute(previewSql);

            let requiredColumns: string[] = [];
            if (mode === 'outbound') requiredColumns = ['outbound_id', 'product_model', 'product_name', 'quantity', 'customer_name', 'outbound_date'];
            else if (mode === 'inventory') requiredColumns = ['warehouse', 'product_model', 'quantity'];
            else if (mode === 'inbound') requiredColumns = ['entry_id', 'product_model', 'product_name', 'quantity', 'arrival_date', 'supplier', 'warehouse'];

            const validation = { valid: true, errors: [] as string[], warnings: [] as string[] };
            if (rows.length > 0) {
                const cols = Object.keys(rows[0]);
                requiredColumns.forEach(c => { if (!cols.includes(c)) { validation.valid = false; validation.errors.push(`Missing: ${c}`); } });
            }

            return { rows, validation };
        } catch (error) {
            throw new Error('Preview failed: ' + (error as Error).message);
        } finally {
            if (connection) await connection.end();
        }
    }

    // --- Core Sync Logic (Batch Mode) ---

    async processSync() {
        if (DataSyncService.isSyncing) return { success: false, message: 'Already running' };
        DataSyncService.isSyncing = true;
        DataSyncService.syncStartTime = Date.now();

        const config = await this.getConfig();
        let connection;
        let syncedCount = 0;
        let updateCount = 0;
        let processedTotal = 0;

        try {
            await this.log('[Outbound][Init] Starting sync process (Batch Mode)...', LOG_FILE);
            connection = await mysql.createConnection({
                host: config.host, user: config.user, password: config.password, database: config.database, port: config.port || 3306
            });
            await this.log('[Outbound][Connect] Remote database connected successfully.', LOG_FILE);

            let syncSql = config.sql!.trim();
            if (syncSql.endsWith(';')) syncSql = syncSql.slice(0, -1);

            const [[{ total }]] = await connection.execute(`SELECT COUNT(*) as total FROM (${syncSql}) as t`) as any;
            await this.log(`[Outbound][Query] Total records found: ${total}. Starting stream processing...`, LOG_FILE);
            const stream = (connection as any).connection.query(syncSql).stream();

            const BATCH_SIZE = 1000;
            let buffer: any[] = [];

            const flush = async (rows: any[]) => {
                if (rows.length === 0) return;
                const vals: any[] = [];
                const placeholders: string[] = [];

                rows.forEach(r => {
                    const id = r.outbound_id || r.id;
                    if (!id) return;
                    placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())');
                    vals.push(id, r.product_model || '', r.product_name || 'Unknown', r.product_type || '', r.quantity || 0, r.customer_name || 'Unknown', r.customer_code || '', r.unit_price || 0, r.outbound_date || new Date(), r.warehouse || '');
                });

                if (placeholders.length > 0) {
                    const sql = `INSERT IGNORE INTO shiplist (outbound_id, product_model, product_name, product_type, quantity, customer_name, customer_code, unit_price, outbound_date, warehouse, created_at) VALUES ${placeholders.join(',')}`;
                    const [res]: [any, any] = await db.execute(sql, vals);
                    syncedCount += res.affectedRows;
                }

                for (const r of rows) {
                    if (r.product_model && r.warehouse) {
                        const [res]: [any, any] = await db.execute("UPDATE StockList SET warehouse = ?, product_type = COALESCE(?, product_type), updated_at = NOW() WHERE sku = ?", [r.warehouse, r.product_type || null, r.product_model]);
                        if (res.affectedRows > 0) updateCount++;
                    }
                    if (r.customer_code && r.customer_name) await CustomerModel.upsert({ customer_code: r.customer_code, customer_name: r.customer_name });
                }
            };

            for await (const row of stream) {
                processedTotal++;
                buffer.push(row);
                if (buffer.length >= BATCH_SIZE) {
                    await flush(buffer);
                    buffer = [];
                    const pct = total > 0 ? ((processedTotal / total) * 100).toFixed(1) : '0';
                    await this.log(`[Outbound][Progress] ${processedTotal}/${total} (${pct}%)`, LOG_FILE);
                }
            }
            if (buffer.length > 0) await flush(buffer);

            const duration = ((Date.now() - DataSyncService.syncStartTime!) / 1000).toFixed(1);
            await this.log(`[Outbound][Completed] Sync finished in ${duration}s. Summary: Processed=${processedTotal}, Subscribed=${syncedCount}, Updated=${updateCount}`, LOG_FILE);

            // Background recap
            import('./stockService').then(m => m.StockService.recalculateAll()).catch(() => { });

            return { success: true, imported: syncedCount, updated: updateCount };
        } catch (e) {
            await this.log(`[Outbound][Error] ${(e as Error).message}`, LOG_FILE);
            throw e;
        } finally {
            DataSyncService.isSyncing = false;
            DataSyncService.syncStartTime = null;
            if (connection) await connection.end();
        }
    }

    async processInventorySync() {
        if (DataSyncService.isInventorySyncing) return { success: false, message: 'Already running' };
        DataSyncService.isInventorySyncing = true;
        DataSyncService.inventorySyncStartTime = Date.now();

        const config = await this.getInventoryConfig();
        let connection;
        let created = 0, updated = 0, totalProcessed = 0;

        try {
            await this.log('[Inventory][Init] Starting inventory sync...', INVENTORY_LOG_FILE);
            connection = await mysql.createConnection({
                host: config.host, user: config.user, password: config.password, database: config.database, port: config.port || 3306
            });
            await this.log('[Inventory][Connect] Remote database connected.', INVENTORY_LOG_FILE);

            let syncSql = config.sql!.trim();
            if (syncSql.endsWith(';')) syncSql = syncSql.slice(0, -1);

            const [[{ total }]] = await connection.execute(`SELECT COUNT(*) as total FROM (${syncSql}) as t`) as any;
            await this.log(`[Inventory][Query] Found ${total} records to sync.`, INVENTORY_LOG_FILE);
            const stream = (connection as any).connection.query(syncSql).stream();

            for await (const row of stream) {
                totalProcessed++;
                const sku = row.product_model;
                if (!sku) continue;

                const [exist] = await db.execute('SELECT id FROM StockList WHERE sku = ?', [sku]) as any[];
                if (exist.length > 0) {
                    await db.execute('UPDATE StockList SET inStock = ?, available = ?, warehouse = ?, updated_at = NOW() WHERE id = ?', [Number(row.quantity || 0), Number(row.quantity || 0), row.warehouse || '', exist[0].id]);
                    updated++;
                } else {
                    await StockModel.create({
                        sku, name: row.product_name || 'Unknown', status: StockStatus.HEALTHY, inStock: Number(row.quantity || 0), available: Number(row.quantity || 0), inTransit: 0, unit: row.unit || '个', warehouse: row.warehouse || '', product_type: row.product_type || null
                    });
                    created++;
                }

                if (totalProcessed % 1000 === 0) {
                    const pct = total > 0 ? ((totalProcessed / total) * 100).toFixed(1) : '0';
                    await this.log(`[Inventory][Progress] ${totalProcessed}/${total} (${pct}%)`, INVENTORY_LOG_FILE);
                }
            }

            const duration = ((Date.now() - DataSyncService.inventorySyncStartTime!) / 1000).toFixed(1);
            await this.log(`[Inventory][Completed] Sync finished in ${duration}s. Created=${created}, Updated=${updated}`, INVENTORY_LOG_FILE);
            return { success: true, created, updated };
        } catch (e) {
            await this.log(`[Inventory][Error] ${(e as Error).message}`, INVENTORY_LOG_FILE);
            throw e;
        } finally {
            DataSyncService.isInventorySyncing = false;
            DataSyncService.inventorySyncStartTime = null;
            if (connection) await connection.end();
        }
    }

    async processInboundSync() {
        if (DataSyncService.isInboundSyncing) return { success: false, message: 'Already running' };
        DataSyncService.isInboundSyncing = true;
        DataSyncService.inboundSyncStartTime = Date.now();

        const config = await this.getInboundConfig();
        let connection;
        let created = 0, totalProcessed = 0;

        try {
            await this.log('[Inbound][Init] Starting inbound sync (Batch Mode)...', INBOUND_LOG_FILE);
            connection = await mysql.createConnection({
                host: config.host, user: config.user, password: config.password, database: config.database, port: config.port || 3306
            });
            await this.log('[Inbound][Connect] Remote database connected.', INBOUND_LOG_FILE);

            let syncSql = config.sql!.trim();
            if (syncSql.endsWith(';')) syncSql = syncSql.slice(0, -1);

            const [[{ total }]] = await connection.execute(`SELECT COUNT(*) as total FROM (${syncSql}) as t`) as any;
            await this.log(`[Inbound][Query] ${total} inbound records identified.`, INBOUND_LOG_FILE);
            const stream = (connection as any).connection.query(syncSql).stream();

            const BATCH_SIZE = 1000;
            let buffer: any[] = [];

            const flush = async (rows: any[]) => {
                if (rows.length === 0) return;
                const vals: any[] = [];
                const placeholders: string[] = [];

                rows.forEach(r => {
                    const id = r.entry_id || r.id;
                    if (!id || !r.product_model) return;
                    placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, "PENDING", NOW())');
                    vals.push(id, r.product_model, r.product_name || 'Unknown', r.quantity || 0, r.unit_price || 0, r.purchase_date || null, r.arrival_date || new Date(), r.supplier || 'Unknown', r.warehouse || '');
                });

                if (placeholders.length > 0) {
                    const sql = `INSERT IGNORE INTO entry_list (entry_id, sku, product_name, quantity, unit_price, purchase_date, arrival_date, supplier, warehouse, status, created_at) VALUES ${placeholders.join(',')}`;
                    const [res]: [any, any] = await db.execute(sql, vals);
                    created += res.affectedRows;
                }
            };

            for await (const row of stream) {
                totalProcessed++;
                buffer.push(row);
                if (buffer.length >= BATCH_SIZE) {
                    await flush(buffer);
                    buffer = [];
                    const pct = total > 0 ? ((totalProcessed / total) * 100).toFixed(1) : '0';
                    await this.log(`[Inbound][Progress] ${totalProcessed}/${total} (${pct}%)`, INBOUND_LOG_FILE);
                }
            }
            if (buffer.length > 0) await flush(buffer);

            const duration = ((Date.now() - DataSyncService.inboundSyncStartTime!) / 1000).toFixed(1);
            await this.log(`[Inbound][Completed] Sync finished in ${duration}s. Processed=${totalProcessed}, NewRecords=${created}`, INBOUND_LOG_FILE);
            return { success: true, created };
        } catch (e) {
            await this.log(`[Inbound][Error] ${(e as Error).message}`, INBOUND_LOG_FILE);
            throw e;
        } finally {
            DataSyncService.isInboundSyncing = false;
            DataSyncService.inboundSyncStartTime = null;
            if (connection) await connection.end();
        }
    }

    async getLogs(type: 'outbound' | 'inventory' | 'inbound' = 'outbound') {
        const file = type === 'inventory' ? INVENTORY_LOG_FILE : (type === 'inbound' ? INBOUND_LOG_FILE : LOG_FILE);
        try {
            const data = await fs.readFile(file, 'utf-8');
            return data.split('\n').filter(Boolean).slice(-1000);
        } catch {
            return [];
        }
    }

    private async log(message: string, file: string) {
        const timestamp = new Date().toISOString();
        try { await fs.appendFile(file, `${timestamp} - ${message}\n`); } catch { }
    }
}
