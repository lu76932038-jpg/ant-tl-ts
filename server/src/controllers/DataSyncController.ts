
import { Request, Response } from 'express';
import { DataSyncService } from '../services/DataSyncService';

export class DataSyncController {
    private dataSyncService: DataSyncService;

    constructor() {
        this.dataSyncService = new DataSyncService();
    }

    // Save configuration (merged)
    saveConfig = async (req: Request, res: Response): Promise<void> => {
        try {
            const newConfig = req.body;
            const currentConfig = await this.dataSyncService.getConfig();
            const mergedConfig = { ...currentConfig, ...newConfig };
            await this.dataSyncService.saveConfig(mergedConfig);
            res.json({ message: '配置已保存' });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    // Save Inventory configuration
    saveInventoryConfig = async (req: Request, res: Response): Promise<void> => {
        try {
            const newConfig = req.body;
            const currentConfig = await this.dataSyncService.getInventoryConfig();
            const mergedConfig = { ...currentConfig, ...newConfig };
            await this.dataSyncService.saveInventoryConfig(mergedConfig);
            res.json({ message: '库存同步配置已保存' });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    // Save Inbound configuration
    saveInboundConfig = async (req: Request, res: Response): Promise<void> => {
        try {
            const newConfig = req.body;
            const currentConfig = await this.dataSyncService.getInboundConfig();
            const mergedConfig = { ...currentConfig, ...newConfig };
            await this.dataSyncService.saveInboundConfig(mergedConfig);
            res.json({ message: '入库同步配置已保存' });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    // Get configuration
    getConfig = async (req: Request, res: Response): Promise<void> => {
        try {
            const config = await this.dataSyncService.getConfig();
            res.json(config);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    // Get Inventory configuration
    getInventoryConfig = async (req: Request, res: Response): Promise<void> => {
        try {
            const config = await this.dataSyncService.getInventoryConfig();
            res.json(config);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };



    // Get Inbound configuration
    getInboundConfig = async (req: Request, res: Response): Promise<void> => {
        try {
            const config = await this.dataSyncService.getInboundConfig();
            res.json(config);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    // Test database connection
    testConnection = async (req: Request, res: Response): Promise<void> => {
        try {
            const config = req.body;
            const success = await this.dataSyncService.testConnection(config);
            if (success) {
                res.json({ message: '连接成功' });
            } else {
                res.status(400).json({ error: '连接失败' });
            }
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    // Test SQL (Preview)
    testSql = async (req: Request, res: Response): Promise<void> => {
        try {
            const { config, mode } = req.body; // Expecting { config: {...}, mode: 'outbound' | 'inventory' }
            // Backwards compatibility check
            const cfg = config || req.body;
            const m = mode || 'outbound';

            const result = await this.dataSyncService.executeSqlPreview(cfg, m);
            res.json(result); // { rows, validation }
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    // Trigger Sync (Outbound)
    triggerSync = async (req: Request, res: Response): Promise<void> => {
        try {
            // Trigger sync in background to prevent HTTP timeout
            this.dataSyncService.processSync().catch(err => {
                console.error('Background sync failed:', err);
            });

            res.json({
                success: true,
                message: 'Data sync started in background. Please check logs for progress.'
            });
        } catch (error) {
            res.status(500).json({ success: false, message: (error as Error).message });
        }
    };

    // Trigger Inventory Sync
    triggerInventorySync = async (req: Request, res: Response): Promise<void> => {
        try {
            this.dataSyncService.processInventorySync().catch(err => {
                console.error('Background inventory sync failed:', err);
            });

            res.json({
                success: true,
                message: 'Inventory sync started in background. Please check logs for progress.'
            });
        } catch (error) {
            res.status(500).json({ success: false, message: (error as Error).message });
        }
    };

    // Trigger Inbound Sync
    triggerInboundSync = async (req: Request, res: Response): Promise<void> => {
        try {
            this.dataSyncService.processInboundSync().catch(err => {
                console.error('Background inbound sync failed:', err);
            });

            res.json({
                success: true,
                message: 'Inbound sync started in background. Please check logs for progress.'
            });
        } catch (error) {
            res.status(500).json({ success: false, message: (error as Error).message });
        }
    };

    // Get logs
    getLogs = async (req: Request, res: Response): Promise<void> => {
        try {
            const type = (req.query.type as 'outbound' | 'inventory' | 'inbound') || 'outbound';
            const logs = await this.dataSyncService.getLogs(type);
            res.json(logs);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    // Get sync status
    getStatus = async (req: Request, res: Response): Promise<void> => {
        try {
            const status = this.dataSyncService.getSyncStatus();
            res.json(status);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    // 强制重置同步锁
    forceReset = async (req: Request, res: Response): Promise<void> => {
        try {
            const result = this.dataSyncService.forceResetSync();
            res.json(result);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };
}
