
import { config } from '../config/env';

const API_KEY = config.ai.geminiKey ? '******' : 'MISSING';
const MODEL = config.ai.geminiModel;
const BASE_URL = config.ai.geminiUrl;

console.log('--- Gemini Configuration Debug ---');
console.log(`BASE_URL (config.ai.geminiUrl): '${BASE_URL}'`);
console.log(`MODEL: '${MODEL}'`);
console.log(`API_KEY Present: ${API_KEY !== 'MISSING'}`);

const constructedURL = `${BASE_URL}/models/${MODEL}:generateContent?key=${config.ai.geminiKey}`;
// Mask key in URL for display
const maskedURL = constructedURL.replace(config.ai.geminiKey, '******');

console.log(`\nConstructed URL: '${maskedURL}'`);

if (BASE_URL.endsWith('/')) {
    console.warn('WARNING: BASE_URL ends with a slash. This might cause double slashes if not handled.');
}

if (!BASE_URL.includes('v1beta') && !BASE_URL.includes('v1')) {
    console.warn('WARNING: BASE_URL does not appear to verify API version (v1beta/v1). Ensure your base URL is correct.');
}
