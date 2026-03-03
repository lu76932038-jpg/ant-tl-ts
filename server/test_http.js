const http = require('http');

http.get('http://localhost:3000/api/credit-risk/detail/CUST076446', {
    headers: {
        // maybe need auth? Let's see if 401 returns
    }
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log("Status:", res.statusCode);
        console.log("Data:", data);
    });
});
