import axios from 'axios';

async function testSendCodeAPI() {
    const email = 'lujiaqi@ant-fa.com';
    const apiUrl = 'http://localhost:3002/api/auth/send-code';

    console.log(`Testing API: ${apiUrl} for ${email}`);

    try {
        const response = await axios.post(apiUrl, { email });
        console.log('SUCCESS: API responded with:', response.data);
    } catch (error: any) {
        console.error('FAILURE: API call failed.');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

testSendCodeAPI();
