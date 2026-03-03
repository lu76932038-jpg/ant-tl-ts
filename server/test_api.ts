import axios from 'axios';

async function testApi() {
    try {
        const response = await axios.get('http://localhost:3000/api/credit-risk/detail/CUST076446');
        console.log("API Response Headers:", response.headers);
        console.log("API Response Data:", JSON.stringify(response.data, null, 2));
    } catch (e) {
        console.error("Error making request", e.message);
    }
}

testApi();
