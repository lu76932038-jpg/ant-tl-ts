
const axios = require('axios');

async function testSub2API() {
    const config = {
        key: 'sk-29bababa8972acb21906e1eb088ed36e68cc592c98e26ca8706662d72deddb91',
        baseUrl: 'https://vpsairobot.com'
    };

    const companyName = "华为技术有限公司";

    const prompt = `你是一个专业的企业信用数据抓取助手。
请联网查询【${companyName}】的最新的企业信用信息。
你需要返回以下信息：
1. 工商登记情况：是否存在经营异常、最近是否有重大变更、工商注册号。
2. 司法风险：风险等级(safe/warning/danger)和简要描述。
3. 税务评级：最新的纳税信用等级（A/B/M/C/D）及评定年度。

请严格按照以下 JSON 格式返回，不要包含任何多余文字：
{
  "businessRegistration": {
    "status": "normal",
    "recentChanges": "描述",
    "registrationNumber": "123"
  },
  "judicialRisk": {
    "level": "safe",
    "pendingCasesCount": 0,
    "latestCaseSummary": "无"
  },
  "taxRating": {
    "grade": "A",
    "evaluatedYear": "2023"
  }
}`;

    console.log("🚀 开始测试 Sub2API 联网抓取...");

    try {
        // Sub2API 特有协议路径 /v1/responses
        const response = await axios.post(`${config.baseUrl}/v1/responses`, {
            model: "gpt-5.3-codex",
            prompt: prompt, // 有些 responses 协议使用的是 prompt 而不是 messages
            temperature: 0.1
        }, {
            headers: {
                'Authorization': `Bearer ${config.key}`,
                'Content-Type': 'application/json'
            },
            timeout: 60000
        });

        console.log("✅ API 响应成功！");
        console.log("------------------------------------------");
        console.log(JSON.stringify(response.data, null, 2));
        console.log("------------------------------------------");
        console.log("🔍 联网能力检查: 如果 JSON 内容包含最新的年份或具体的变更信息，说明联网正常。");

    } catch (err) {
        console.log("❌ 测试失败！");
        if (err.response) {
            console.log("状态码:", err.response.status);
            console.log("错误信息:", JSON.stringify(err.response.data, null, 2));
        } else {
            console.log("错误消息:", err.message);
        }
    }
}

testSub2API();
