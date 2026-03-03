import axios from 'axios';
import fs from 'fs';
import path from 'path';

// 常量配置
const LOGIN_URL = 'http://101.132.103.175:7900/ant-tool/api/auth/login';
const API_URL = 'http://101.132.103.175:7900/ant-tool/api/feedbacks';

// 专用于获取反馈的自动登录账号信息（已在后端数据库中预置）
const BOT_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
};
// 为了避免并发或频繁写入，保存一个游标状态文件
const STATE_FILE = path.join(__dirname, '..', '..', '.agent', 'tmp', 'sync_feedbacks_state.json');
const OUTPUT_FILE = path.join(__dirname, '..', '..', '.agent', 'tmp', 'new_feedbacks.json');

// 判断是否为手工运行
const isManual = process.argv.includes('--manual');

// 读取最后一次同步的时间戳
function getLastFetchTime(): string | null {
  if (fs.existsSync(STATE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
      return data.lastFetchTime || null;
    } catch (e) {
      return null;
    }
  }
  return null;
}

// 保存同步状态
function saveState(lastFetchTime: string) {
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(STATE_FILE, JSON.stringify({ lastFetchTime }, null, 2));
}

// 追加保存新的反馈数据
function saveNewFeedbacks(feedbacks: any[]) {
  if (feedbacks.length === 0) return;
  const dir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let existing = [];
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
    } catch (e) {
      existing = [];
    }
  }

  // 去重后保存
  const existingIds = new Set(existing.map((f: any) => f.id || f.feedback_id));
  const newItems = feedbacks.filter((f: any) => !existingIds.has(f.id || f.feedback_id));
  
  const updatedList = [...existing, ...newItems];
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(updatedList, null, 2));
  console.log(`✅ [本地存储] 成功新增 ${newItems.length} 条反馈，当前未处理列表剩余 ${updatedList.length} 条。`);
}

async function main() {
  console.log(`🚀 [任务启动] 开始抓取社区反馈。执行模式: ${isManual ? '手工触发' : '定时执行'}`);
  const lastFetchTime = getLastFetchTime();
  if (lastFetchTime) {
    console.log(`⏱️  上一次抓取时间: ${lastFetchTime}`);
  } else {
    console.log(`⏱️  无上一次抓取记录，准备全量拉取或按默认时间窗拉取`);
  }

  try {
    // 构建请求参数（若后端支持 since 增量获取，可以传入对应的参数）
    // 此处假设接口接收 last_fetch_time 作为筛选条件
    const params: any = {};
    if (lastFetchTime) {
      params.last_fetch_time = lastFetchTime;
    }

    // 1. 先进行自动登录获取 Token
    console.log(`📡 尝试登录获取 Token: ${LOGIN_URL}`);
    const loginRes = await axios.post(LOGIN_URL, BOT_CREDENTIALS);
    const token = loginRes.data.token;
    if (!token) {
      throw new Error('未从登录接口获取到有效的 Token');
    }
    console.log(`✅ 成功获取系统鉴权 Token`);

    // 2. 携带 Token 去拉取社区反馈
    console.log(`📡 发起 API 请求拉取数据: ${API_URL}`);
    const response = await axios.get(API_URL, { 
      params,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // 假设响应格式是标准封装 { code: 200, data: [...] }，根据实际情况修改
    const responseData = response.data;
    
    // 若返回出错，抛出异常
    if (responseData.code !== 200 && responseData.code !== undefined) {
      throw new Error(`请求接口异常, 状态码: ${responseData.code}, 消息: ${responseData.msg || '未知'}`);
    }

    const feedbacks = Array.isArray(responseData.data) ? responseData.data : (Array.isArray(responseData) ? responseData : []);

    if (feedbacks.length === 0) {
      console.log(`ℹ️ [结果] 没有检测到新的反馈数据。`);
    } else {
      console.log(`🎉 [结果] 成功获取到 ${feedbacks.length} 条新反馈!`);
      saveNewFeedbacks(feedbacks);
    }
    
    // 成功后记录本次操作时间（ISO 格式）
    const now = new Date().toISOString();
    saveState(now);
    console.log(`✅ 同步完成！状态已更新。当前时间: ${now}`);

  } catch (error: any) {
    console.error(`❌ [错误] 获取反馈失败:`, error.message);
    if (error.response) {
      console.error(`❌ 后端响应状态: ${error.response.status}`);
      // 判断是否未配置接口的情况 (404)
      if (error.response.status === 404) {
          console.error(`⚠️ 前方提示: 请确认后端服务代码中是否已经编写了 /feedbacks 路由接口。`);
      }
    }
  }
}

main();
