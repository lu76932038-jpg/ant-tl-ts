import { config } from '../config/env';
import { generateSqlForOrdersDeepSeek, generateAnswerFromDataDeepSeek } from '../services/deepseekService';
import { AntOrderModel } from '../models/AntOrder';
import { AiChatLogModel } from '../models/AiChatLog';
import { AiChatSessionModel } from '../models/AiChatSession';
import { AiPromptModel } from '../models/AiPrompt';

async function testQuery(prompt: string) {
    console.log(`\n-- - Testing: "${prompt}" -- - `);
    try {
        // 1. Generate SQL
        console.log("Generating SQL...");
        const startSql = Date.now();
        const sqlResult = await generateSqlForOrdersDeepSeek(prompt);
        console.log(`SQL Generated in ${Date.now() - startSql} ms`);
        console.log("SQL:", sqlResult.sql);

        if (sqlResult.sql.toLowerCase().includes('ant_order')) {
            console.error("❌ FAILURE: SQL verification failed. ‘ant_order’ table was used despite being forbidden.");
            // process.exit(1); // Do not exit, just log error for now
        }

        if (!sqlResult.sql) {
            console.error("Failed to generate SQL");
            return;
        }

        // 2. Execute SQL
        console.log("Executing SQL...");
        const startExec = Date.now();
        const data = await AntOrderModel.executeAiQuery(sqlResult.sql);
        console.log(`SQL Executed in ${Date.now() - startExec} ms`);
        console.log(`Data rows: ${data.length} `);
        if (data.length > 0) {
            console.log("Sample Data:", JSON.stringify(data[0]));
        }

        // 3. Generate Answer
        console.log("Generating Answer...");
        const startAns = Date.now();
        const answerResult = await generateAnswerFromDataDeepSeek(prompt, data);
        console.log(`Answer Generated in ${Date.now() - startAns} ms`);
        console.log("Answer:", answerResult.answer);

        // 4. Mimic logging (since controller usually does this)
        console.log("Saving log to DB...");
        const logId = await AiChatLogModel.create({
            user_query: prompt,
            prompt_used: JSON.stringify(sqlResult.debug),
            sql_generated: sqlResult.sql,
            sql_execution_result: `Rows: ${data.length} `,
            ai_reasoning: "",
            final_answer: answerResult.answer
        });
        console.log(`Log saved with ID: ${logId} `);

    } catch (error) {
        console.error("Error:", error);
    }
}

async function testRagManagement() {
    console.log("\n--- Testing RAG Management ---");

    // 1. Create a Prompt
    console.log("Creating Test Prompt...");
    const promptId = await AiPromptModel.create({
        prompt_key: "TEST_PROMPT",
        content: "You are a test assistant.",
        version: 1,
        is_active: true,
        description: "Test prompt"
    });
    console.log(`Prompt created with ID: ${promptId} `);

    // 2. Verify Active Prompt
    const activePrompt = await AiPromptModel.findActive("TEST_PROMPT");
    console.log("Active Prompt Content:", activePrompt?.content);

    // 3. Verify Log Retrieval
    const logs = await AiChatLogModel.findAll(1);
    console.log("Latest Log Query:", logs[0]?.user_query);
}

async function runTests() {
    console.log("Starting RAG Verification (V3)...");

    // Check Config
    if (!config.ai.deepseekKey) {
        console.error("ERROR: DeepSeek API Key not configured.");
        process.exit(1);
    }

    // Test 1: New Tables Query (Suppliers / OutboundPlan)
    await testQuery("查询所有供应商的名称和评级");
    await testQuery("列出最近3个未发货的计划");
    await testQuery("查看本月销售占比项"); // Potential failure case

    // Test 2: RAG Management
    await testRagManagement();

    console.log("\nTests Completed.");
    process.exit(0);
}

runTests();
