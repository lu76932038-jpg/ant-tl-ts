
import { Router } from 'express';
import { DataSyncController } from '../controllers/DataSyncController';

const router = Router();
const controller = new DataSyncController();

// Save MySQL config
router.post('/config', controller.saveConfig);

// Get current config
router.get('/config', controller.getConfig);

// Save Inventory config
router.post('/config/inventory', controller.saveInventoryConfig);

// Get Inventory config
router.get('/config/inventory', controller.getInventoryConfig);

// Save Inbound config
router.post('/config/inbound', controller.saveInboundConfig);

// Get Inbound config
router.get('/config/inbound', controller.getInboundConfig);

// Test database connection
router.post('/test', controller.testConnection);

// Test SQL execution (Preview)
router.post('/test-sql', controller.testSql);

// Manually trigger sync (Outbound)
router.post('/sync', controller.triggerSync);

// Manually trigger inventory sync
router.post('/sync/inventory', controller.triggerInventorySync);

// Manually trigger inbound sync
router.post('/sync/inbound', controller.triggerInboundSync);

// Get sync logs
router.get('/logs', controller.getLogs);

// Get sync status
router.get('/status', controller.getStatus);

// 强制重置同步锁
router.post('/force-reset', controller.forceReset);

export default router;
