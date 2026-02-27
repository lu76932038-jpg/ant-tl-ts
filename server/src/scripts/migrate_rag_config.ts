
import { AiPromptModel } from '../models/AiPrompt';
import { AiSchemaDocModel } from '../models/AiSchemaDoc';
import {
    EXTRACT_INSTRUCTION_DEEPSEEK,
    EXTRACT_INSTRUCTION_GEMINI,
    SQL_INSTRUCTION,
    ANSWER_INSTRUCTION,
    RESTORE_RAW_TABLE_INSTRUCTION
} from '../config/prompts';
import pool from '../config/database';

const migrate = async () => {
    try {
        console.log('Starting RAG configuration migration...');

        // 1. Migrate Prompts
        const prompts = [
            {
                key: 'extract_instruction_deepseek',
                content: EXTRACT_INSTRUCTION_DEEPSEEK,
                description: 'DeepSeek 数据提取指令 (含 Schema)'
            },
            {
                key: 'extract_instruction_gemini',
                content: EXTRACT_INSTRUCTION_GEMINI,
                description: 'Gemini 数据提取指令 (无 Schema)'
            },
            {
                key: 'sql_instruction',
                content: SQL_INSTRUCTION,
                description: 'SQL 生成指令'
            },
            {
                key: 'answer_instruction',
                content: ANSWER_INSTRUCTION,
                description: '自然语言回答生成指令'
            },
            {
                key: 'restore_raw_table_instruction',
                content: RESTORE_RAW_TABLE_INSTRUCTION,
                description: '表格还原指令'
            }
        ];

        console.log('Migrating Prompts...');
        for (const p of prompts) {
            const existing = await AiPromptModel.findActive(p.key);
            if (!existing) {
                console.log(`Creating prompt: ${p.key}`);
                await AiPromptModel.create({
                    prompt_key: p.key,
                    content: p.content,
                    version: 1,
                    is_active: true,
                    description: p.description
                });
            } else {
                console.log(`Prompt exists: ${p.key}, skipping.`);
            }
        }

        // 2. Migrate Schema Docs
        console.log('Migrating Schema Docs...');

        // Extracted from geminiService.ts
        const antOrderSchema = `
字段:
- 订单日期 (Date)
- 订单号 (string, 主键)
- 产品型号 (string)
- 产品名 (string)
- 销售数量 (number)
- 销售单位 (string)
- 未税单价 (number)
- 未税小计 (number)
- 客户名 (string)
- 销售员 (string)
- 出库数量 (number)
- 合同交期 (Date)
        `.trim();

        const schemas = [
            {
                table_name: 'ant_order',
                description: '存储所有客户订单信息，包括产品、单价和客户名称',
                column_info: antOrderSchema
            }
        ];

        for (const s of schemas) {
            console.log(`Upserting schema: ${s.table_name}`);
            await AiSchemaDocModel.upsert({
                table_name: s.table_name,
                description: s.description,
                column_info: s.column_info
            });
        }

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
