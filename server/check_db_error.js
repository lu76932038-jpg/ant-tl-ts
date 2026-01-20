const pool = require('./dist/config/database').default;

async function checkErrors() {
    try {
        const [rows] = await pool.execute('SELECT id, file_name, status, error_message, created_at FROM inquiry_tasks ORDER BY created_at DESC LIMIT 3');
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkErrors();
