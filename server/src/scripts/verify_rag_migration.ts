
import { AiPromptModel } from '../models/AiPrompt';
import { AiSchemaDocModel } from '../models/AiSchemaDoc';
import pool from '../config/database';

const verify = async () => {
    try {
        console.log('Verifying RAG configuration...');

        const prompts = await AiPromptModel.findAll();
        console.log(`Found ${prompts.length} prompts.`);
        prompts.forEach(p => console.log(`- ${p.prompt_key} (v${p.version}) [Date: ${p.updated_at}]`));

        const schemas = await AiSchemaDocModel.findAll();
        console.log(`Found ${schemas.length} schemas.`);
        schemas.forEach(s => console.log(`- ${s.table_name}`));

        if (prompts.length > 0 && schemas.length > 0) {
            console.log('Verification PASSED: Data exists in DB.');
        } else {
            console.error('Verification FAILED: Data missing.');
            process.exit(1);
        }

        process.exit(0);
    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
};

verify();
