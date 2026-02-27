
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
const OUTBOUND_PLAN_CONFIG_KEY = 'outbound_plan_data_sync_config';
const OUTBOUND_PLAN_LOG_FILE = path.join(process.cwd(), 'outbound-plan-sync.log');

// 同步超时时间（毫秒），防止卡死永久占锁
const SYNC_TIMEOUT_MS = 120 * 60 * 1000; // 增加到120分钟，适应大数据量同步 (58万条约需1.6h)

export class DataSyncService {

    private static isSyncing = false;
    private static isInventorySyncing = false;
    private static isInboundSyncing = false;
    private static isOutboundPlanSyncing = false;
    private static syncStartTime: number | null = null;
    private static inventorySyncStartTime: number | null = null;
    private static inboundSyncStartTime: number | null = null;
    private static outboundPlanSyncStartTime: number | null = null;

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
        if (DataSyncService.isOutboundPlanSyncing && DataSyncService.outboundPlanSyncStartTime) {
            const elapsed = Date.now() - DataSyncService.outboundPlanSyncStartTime;
            if (elapsed > SYNC_TIMEOUT_MS) {
                const msg = `[OutboundPlan][Warn] 出库计划同步超时（${Math.round(elapsed / 60000)}分钟），自动释放锁`;
                console.warn(msg);
                this.log(msg, OUTBOUND_PLAN_LOG_FILE).catch(() => { });
                DataSyncService.isOutboundPlanSyncing = false;
                DataSyncService.outboundPlanSyncStartTime = null;
            }
        }
        return {
            isSyncing: DataSyncService.isSyncing,
            isInventorySyncing: DataSyncService.isInventorySyncing,
            isInboundSyncing: DataSyncService.isInboundSyncing,
            isOutboundPlanSyncing: DataSyncService.isOutboundPlanSyncing
        };
    }

    public forceResetSync() {
        DataSyncService.isSyncing = false;
        DataSyncService.syncStartTime = null;
        DataSyncService.isInventorySyncing = false;
        DataSyncService.inventorySyncStartTime = null;
        DataSyncService.isInboundSyncing = false;
        DataSyncService.inboundSyncStartTime = null;
        DataSyncService.isOutboundPlanSyncing = false;
        DataSyncService.outboundPlanSyncStartTime = null;
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
        return this.getConfigByKey(INVENTORY_CONFIG_KEY);
    }

    public async saveInboundConfig(config: SyncConfig) {
        return this.saveConfigByKey(INBOUND_CONFIG_KEY, config);
    }

    public async saveOutboundPlanConfig(config: SyncConfig) {
        return this.saveConfigByKey(OUTBOUND_PLAN_CONFIG_KEY, config);
    }

    // Helper to get config
    private async getConfigByKey(key: string): Promise<SyncConfig> {
        try {
            const [rows] = await db.execute("SELECT config_value FROM sys_data_sync_config WHERE config_key = ?", [key]) as any[];
            return rows.length > 0 ? JSON.parse(rows[0].config_value) : {};
        } catch (error) {
            return {};
        }
    }

    // Helper to save config
    private async saveConfigByKey(key: string, config: SyncConfig) {
        const configJson = JSON.stringify(config);
        const sql = `INSERT INTO sys_data_sync_config (config_key, config_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE config_value = ?`;
        await db.execute(sql, [key, configJson, configJson]);
    }

    async getInboundConfig(): Promise<SyncConfig> {
        return this.getConfigByKey(INBOUND_CONFIG_KEY);
    }

    public async getOutboundPlanConfig(): Promise<SyncConfig> {
        return this.getConfigByKey(OUTBOUND_PLAN_CONFIG_KEY);
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
                database: config.database,
                connectTimeout: 60000
            });
            await connection.ping();
            return true;
        } catch (error) {
            throw new Error('Connect failed: ' + (error as Error).message);
        } finally {
            if (connection) await connection.end();
        }
    }

    async executeSqlPreview(config: SyncConfig, mode: 'outbound' | 'inventory' | 'inbound' | 'outbound-plan' = 'outbound'): Promise<any> {
        let connection;
        try {
            connection = await mysql.createConnection({
                host: config.host,
                port: config.port || 3306,
                user: config.user,
                password: config.password,
                database: config.database,
                connectTimeout: 60000
            });

            let previewSql = config.sql!.trim();
            if (previewSql.endsWith(';')) previewSql = previewSql.slice(0, -1);
            previewSql = `SELECT * FROM (\n${previewSql}\n) AS tmp LIMIT 5`;

            const [rows]: [any[], any] = await connection.execute(previewSql);

            let requiredColumns: string[] = [];
            if (mode === 'outbound') requiredColumns = ['outbound_id', 'product_model', 'product_name', 'quantity', 'customer_name', 'outbound_date'];
            else if (mode === 'inventory') requiredColumns = ['warehouse', 'product_model', 'quantity'];
            else if (mode === 'inbound') requiredColumns = ['entry_id', 'product_model', 'product_name', 'quantity', 'arrival_date', 'supplier'];
            else if (mode === 'outbound-plan') requiredColumns = ['plan_code', 'product_model', 'product_name', 'quantity', 'planned_date', 'customer_name', 'customer_code'];

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

    async processOutboundSync() {
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

            const [[{ total }]] = await connection.execute(`SELECT COUNT(*) as total FROM (\n${syncSql}\n) as t`) as any;
            await this.log(`[Outbound][Query] Total records found: ${total}. Starting stream processing...`, LOG_FILE);
            const stream = (connection as any).connection.query(syncSql).stream();

            const BATCH_SIZE = 1000;
            let buffer: any[] = [];

            const flush = async (rows: any[]) => {
                if (rows.length === 0) return;
                const vals: any[] = [];
                const placeholders: string[] = [];

                for (const r of rows) {
                    // Outbound ID logic
                    const oid = r.outbound_id || (r.id ? `EXT-${r.id}` : null);

                    if (!oid || !r.product_model) continue;

                    // Fields: outbound_id, product_model, product_name, product_type, outbound_date, quantity, customer_name, customer_code, unit_price, warehouse
                    placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                    vals.push(
                        oid,
                        r.product_model,
                        r.product_name || 'Unknown',
                        r.product_type || '',
                        r.outbound_date || new Date(),
                        r.quantity || 0,
                        r.customer_name || 'Unknown',
                        r.customer_code || '',
                        r.unit_price || 0,
                        r.warehouse || ''
                    );

                    // Sync Customer if info exists
                    if (r.customer_code && r.customer_name) {
                        try {
                            await CustomerModel.upsert({ customer_code: r.customer_code, customer_name: r.customer_name });
                        } catch (e) {
                            console.warn(`Customer upsert warning: ${(e as Error).message}`);
                        }
                    }
                }

                if (placeholders.length > 0) {
                    const sql = `
                        INSERT INTO shiplist (outbound_id, product_model, product_name, product_type, outbound_date, quantity, customer_name, customer_code, unit_price, warehouse) 
                        VALUES ${placeholders.join(',')}
                        ON DUPLICATE KEY UPDATE
                            product_model = VALUES(product_model),
                            product_name = VALUES(product_name),
                            product_type = VALUES(product_type),
                            outbound_date = VALUES(outbound_date),
                            quantity = VALUES(quantity),
                            customer_name = VALUES(customer_name),
                            customer_code = VALUES(customer_code),
                            unit_price = VALUES(unit_price),
                            warehouse = VALUES(warehouse)
                    `;
                    const [res]: [any, any] = await db.execute(sql, vals);
                    // Logic for ON DUPLICATE KEY UPDATE affectedRows:
                    // 1 = Insert new row
                    // 2 = Update existing row
                    // 0 = Row exists and no change

                    // Direct accumulation of affectedRows gives usage indication.
                    // For pure inserts, this equals the row count.
                    // For updates, it implies double the row count.
                    // We will report 'Records Touched' (DB Changes).
                    syncedCount += res.affectedRows;
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
            await this.log(`[Outbound][Completed] Sync finished in ${duration}s. Summary: Processed=${processedTotal}, Synced/Updated (Approx)=${syncedCount}`, LOG_FILE);

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

            const [[{ total }]] = await connection.execute(`SELECT COUNT(*) as total FROM (\n${syncSql}\n) as t`) as any;
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

            const [[{ total }]] = await connection.execute(`SELECT COUNT(*) as total FROM (\n${syncSql}\n) as t`) as any;
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
                    placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, IFNULL(?, "PENDING"), NOW())');
                    vals.push(id, r.product_model, r.product_name || 'Unknown', r.quantity || 0, r.unit_price || 0, r.purchase_date || null, r.arrival_date || new Date(), r.supplier || 'Unknown', r.supplier_code || '', r.warehouse || '', r.status || null);
                });

                if (placeholders.length > 0) {
                    const sql = `INSERT IGNORE INTO entry_list (entry_id, sku, product_name, quantity, unit_price, purchase_date, arrival_date, supplier, supplier_code, warehouse, status, created_at) VALUES ${placeholders.join(',')}`;
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

    async getLogs(type: 'outbound' | 'inventory' | 'inbound' | 'outbound-plan' = 'outbound') {
        const file = type === 'inventory' ? INVENTORY_LOG_FILE :
            (type === 'inbound' ? INBOUND_LOG_FILE :
                (type === 'outbound-plan' ? OUTBOUND_PLAN_LOG_FILE : LOG_FILE));
        try {
            const data = await fs.readFile(file, 'utf-8');
            return data.split('\n').filter(Boolean).slice(-1000);
        } catch {
            return [];
        }
    }

    // Process Outbound Plan Sync
    public async processOutboundPlanSync() {
        if (DataSyncService.isOutboundPlanSyncing) {
            throw new Error('Outbound plan sync already in progress');
        }

        DataSyncService.isOutboundPlanSyncing = true;
        DataSyncService.outboundPlanSyncStartTime = Date.now();
        const log = async (msg: string) => this.log(msg, OUTBOUND_PLAN_LOG_FILE);

        let connection;
        try {
            await log(`Starting outbound plan synchronization...`);
            const config = await this.getOutboundPlanConfig();
            await log(`Target: ${config.host}:${config.port}, User: ${config.user}, DB: ${config.database}`);

            if (!config || !config.host) {
                throw new Error('Database configuration missing');
            }

            // 1. Connect to External DB
            connection = await mysql.createConnection({
                host: config.host,
                port: config.port || 3306,
                user: config.user,
                password: config.password,
                database: config.database,
                connectTimeout: 60000
            });

            await log('Connected to external database.');

            // 2. Fetch Data
            await log(`Executing SQL query...`);
            if (!config.sql) {
                throw new Error('SQL query is not configured.');
            }
            const [rows]: [any[], any] = await connection.execute(config.sql);
            await log(`Fetched ${rows.length} rows.`);

            if (rows.length === 0) {
                await log('No data to sync.');
                return;
            }

            // Clear table before syncing
            await log('Clearing outbound_plan table...');
            await db.execute('TRUNCATE TABLE outbound_plan');

            // 3. Process Data
            // Import OutboundPlanModel explicitly to avoid circular dependency issues if any, though top level import should work
            const { OutboundPlanModel } = require('../models/OutboundPlan');

            let insertedCount = 0;
            let updatedCount = 0;
            let skippedCount = 0;
            let processedTotal = 0;
            const total = rows.length;

            const BATCH_SIZE = 500;
            for (let i = 0; i < rows.length; i += BATCH_SIZE) {
                const batch = rows.slice(i, i + BATCH_SIZE);

                // Prepare batch data
                // Map external columns to internal model: plan_code, sku, product_name, quantity, customer_name, planned_date, warehouse
                // SQL alias expected: plan_code, product_model (mapped to sku), product_name, quantity, customer_name, planned_date, warehouse

                // Using INSERT IGNORE or ON DUPLICATE KEY UPDATE logic depending on requirements. 
                // For plans, usually we want to update if it exists or skip. Let's assume we update status or details if exists? 
                // Simple implementation: Check existence one by one or use upsert. 
                // Given performance requirement, let's use Upsert logic essentially.
                // OutboundPlanModel.create uses INSERT. We'll use a raw query here for batch upsert efficiency similar to ShipListModel.upsertBatch

                if (batch.length === 0) continue;

                const values: any[] = [];
                const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');

                batch.forEach(row => {
                    values.push(
                        row.plan_code,
                        row.product_model, // mapped to sku
                        row.product_name,
                        row.quantity,
                        row.customer_name,
                        row.customer_code || '', // Added customer_code
                        row.planned_date, // Date object or string
                        row.warehouse || '',
                        'PENDING' // Default status
                    );
                });

                // Raw SQL for Batch Upsert
                /* 
                   INSERT INTO outbound_plan (...) VALUES ...
                   ON DUPLICATE KEY UPDATE
                   sku = VALUES(sku), product_name = VALUES(product_name), ...
                */
                // Note: We need a way to execute this raw query. OutboundPlanModel doesn't have upsertBatch yet. 
                // Let's add it to DataSyncService via direct pool access or add to Model. 
                // For now, let's use a simpler loop with error handling or extend OutboundPlanModel later.
                // Actually, writing a raw query here using the pool imported from ../config/database is easiest.
                const pool = require('../config/database').default;

                const sql = `
                    INSERT INTO outbound_plan (plan_code, sku, product_name, quantity, customer_name, customer_code, planned_date, warehouse, status) 
                    VALUES ${placeholders}
                    ON DUPLICATE KEY UPDATE
                        sku = VALUES(sku),
                        product_name = VALUES(product_name),
                        quantity = VALUES(quantity),
                        customer_name = VALUES(customer_name),
                        customer_code = VALUES(customer_code),
                        planned_date = VALUES(planned_date),
                        warehouse = VALUES(warehouse)
                `;

                await pool.execute(sql, values);
                insertedCount += batch.length;
                processedTotal += batch.length;

                if (processedTotal % 2000 === 0 || processedTotal === total) {
                    const pct = ((processedTotal / total) * 100).toFixed(1);
                    await log(`[OutboundPlan][Progress] ${processedTotal}/${total} (${pct}%)`);
                }
            }

            await log(`Sync completed. Processed ${rows.length} records.`);

        } catch (error: any) {
            console.error('Outbound plan sync failed:', error);
            await log(`Error: ${error.message}`);
            throw error;
        } finally {
            if (connection) await connection.end();
            DataSyncService.isOutboundPlanSyncing = false;
            DataSyncService.outboundPlanSyncStartTime = null;
        }
    }

    private async log(message: string, file: string) {
        const timestamp = new Date().toISOString();
        try { await fs.appendFile(file, `${timestamp} - ${message}\n`); } catch { }
    }
}
