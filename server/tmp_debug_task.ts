import pool from './src/config/database';

async function debugTask() {
    const taskId = '93bdfbb5';

    try {
        const [rows]: any = await pool.execute(
            'SELECT process_logs FROM inquiry_tasks WHERE id LIKE ?',
            [`%${taskId}%`]
        );

        if (rows.length === 0) return;

        const task = rows[0];
        const logs = typeof task.process_logs === 'string' ? JSON.parse(task.process_logs) : task.process_logs;

        const ocrLog = logs.find((l: any) => l.step === 'OCR识别' && l.status === 'success');
        if (ocrLog) {
            console.log('\n--- Original OCR Text ---');
            console.log(ocrLog.message); // 通常日志里会带一小部分
            // 虽然 log 里可能没存完整文本，但我们可以去看看 extractedText 是如何存的
        } else {
            console.log('No success OCR log found.');
        }

        // 查找结构还原阶段
        const restoreLog = logs.find((l: any) => l.step === '结构还原');
        if (restoreLog) {
            console.log('\n--- Restore Structure Log ---');
            console.log(JSON.stringify(restoreLog, null, 2));
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

debugTask();
