
import pool from './server/src/config/database';

async function main() {
    try {
        const [rows] = await pool.execute('SHOW PROCESSLIST') as any[];
        console.log('Current DB Processes:');
        rows.forEach((r: any) => {
            if (r.Command !== 'Sleep') {
                console.log(`[${r.Id}] ${r.User} @ ${r.Host} | ${r.Command} | Time: ${r.Time} | State: ${r.State} | Info: ${r.Info ? r.Info.substring(0, 100) : 'NULL'}`);
            }
        });
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}
main();
