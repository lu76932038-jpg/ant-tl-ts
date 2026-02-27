
import db from './server/src/config/database';

async function main() {
    try {
        const [rows] = await db.execute("SELECT config_value FROM sys_data_sync_config WHERE config_key = 'outbound_data_sync_config'") as any[];
        if (rows.length > 0) {
            const config = JSON.parse(rows[0].config_value);
            console.log('--- Outbound Sync Config ---');
            console.log('SQL:', config.sql);
            console.log('Host:', config.host);
            console.log('Database:', config.database);
        } else {
            console.log('No outbound sync config found.');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

main();
