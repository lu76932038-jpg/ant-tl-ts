const axios = require('axios');

async function test() {
    try {
        const loginRes = await axios.post('http://101.132.103.175:7900/ant-tool/api/auth/login', { username: 'admin', password: 'admin123' });
        const token = loginRes.data.token;

        const content = `
    <p><b>【AI 智能甄别与方案评估】</b></p>
    <br/>
    <p><b>问题类型标签：</b><span style="color: #4f46e5; font-weight: bold;">【系统功能研发需求】</span></p>
    <p><i>分类说明：此问题被判定为关于系统自身的功能建设，已流转至研发队列。</i></p>
    <br/>
    <p><b>评估意见：完全可以增加点赞功能！</b></p>
    <br/>
    <p>实际上，从系统底层数据结构来看，后端源程序中的帖子实体表已经预先存留了类似 <code>vote_count: 0</code> 的统计字段。也就是说当前的底层存储与数据模型天然支持点赞（投票）机制，功能落地的可行性非常高。</p>
    <br/>
    <p><b>具体建设方案如下：</b></p>
    <ol>
      <li><b>后端服务</b>：暴露一个供用户操作点赞的接口（如 <code>POST /api/community/vote</code>），当被正确调用时更新统计数据源。</li>
      <li><b>前端展现</b>：在社区帖子的详细页面以及外层列表中添加“👍 赞同”动态交互组件，并对接好相关通信接口。</li>
    </ol>
    <br/>
    <hr/>
    <p><i>【系统处理记录】我根据您的要求，已经为您量身定制了上述方案规划。该规划目前正在【后台管理】等待相应管理员的审批通过，审批完成后开发流程将立即启动，请留意后续在此贴中的进度同步。</i></p>
    `;

        const res = await axios.post(
            'http://101.132.103.175:7900/ant-tool/api/community/questions/4/answers',
            { content },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log('Successfully posted reply to the production platform:', res.data);
    } catch (e) {
        if (e.response) {
            console.error('Error from server:', e.response.data || e.response.statusText);
        } else {
            console.error('Error message:', e.message);
        }
    }
}

test();
