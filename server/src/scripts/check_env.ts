import { config } from '../config/env';

console.log('--- ENV CHECK ---');
console.log('Proxy:', config.proxy);
console.log('Gemini URL:', config.ai.geminiUrl);
console.log('Gemini Key Set:', !!config.ai.geminiKey);
console.log('-----------------');
