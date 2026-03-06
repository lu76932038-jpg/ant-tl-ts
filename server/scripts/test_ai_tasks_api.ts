import axios from 'axios';

async function test() {
    try {
        console.log('Logging in...');
        const loginRes = await axios.post('http://localhost:3002/api/auth/login', { username: 'admin', password: '123456' });
        const token = loginRes.data.token;
        console.log('Login success, fetching tasks...');

        const res = await axios.get('http://localhost:3002/api/ai-tasks', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('API Response Status:', res.status);
        console.log('API Response Data:', res.data);
    } catch (e: any) {
        console.log('Full Error Details:', e);
    }
}

test();
