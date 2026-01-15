import { config } from '../config/env';
import OpenAI from 'openai';
import { HttpsProxyAgent } from 'https-proxy-agent';

async function testDeepSeekConnection() {
    console.log("Testing DeepSeek Connection...");
    console.log("URL:", config.ai.deepseekUrl);
    console.log("Key Configured:", !!config.ai.deepseekKey);
    console.log("Proxy:", config.proxy);

    if (!config.ai.deepseekKey) {
        console.error("Error: DeepSeek API Key not found.");
        return;
    }

    const options: any = {
        baseURL: config.ai.deepseekUrl,
        apiKey: config.ai.deepseekKey
    };

    if (config.proxy) {
        options.httpAgent = new HttpsProxyAgent(config.proxy);
    }

    const openai = new OpenAI(options);

    try {
        console.log("Sending request...");
        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: "Hello, are you there?" }],
            model: "deepseek-chat",
            max_tokens: 10,
        });

        console.log("Response received:");
        console.log(completion.choices[0].message.content);
        console.log("SUCCESS: Connection established via proxy.");
    } catch (error: any) {
        console.error("FAILED: Connection error:", error.message);
        if (error.cause) {
            console.error("Cause:", error.cause);
        }
    }
}

testDeepSeekConnection();
