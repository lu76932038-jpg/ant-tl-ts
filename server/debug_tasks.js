const pool = require('./dist/config/database').default;

async function query() {
    try {
        const [rows] = await pool.execute('SELECT id, file_name, status, error_message, created_at, process_logs FROM inquiry_tasks ORDER BY created_at DESC LIMIT 10');
        const tasks = rows.map(t => ({
            ...t,
            created_at: t.created_at.toLocaleString(),
            process_logs: typeof t.process_logs === 'string' ? JSON.parse(t.process_logs) : t.process_logs
        }));
        console.log(JSON.stringify(tasks, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
query();
