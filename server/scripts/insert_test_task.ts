import { AiTaskModel } from '../src/models/AiTask';

async function run() {
    console.log('Initializing tables...');
    await AiTaskModel.initializeTables();

    console.log('Inserting mock task...');
    const taskId = await AiTaskModel.createTask({
        source_link_id: 4,
        title: '增加点赞功能',
        description: '来自社区帖子 #4 的点赞功能需求建议',
        plan_content: `
            <p><b>【问题类别智能甄别】</b></p>
            <p><b>类别标签：</b><span style="color: #4f46e5; font-weight: bold;">【系统功能研发需求】</span></p>
            <br/>
            <p><b>评估意见：完全可以增加点赞功能！</b></p>
            <p>实际上，从系统底层数据结构来看，后端源程序中的帖子实体表已经预先存留了 <code>vote_count: 0</code> 统计字段，功能落地的可行性非常高。</p>
            <br/>
            <p><b>具体建设方案如下：</b></p>
            <ol>
                <li><b>后端服务</b>：暴露一个供用户操作点赞的接口（如 <code>POST /api/community/vote</code>）。</li>
                <li><b>前端展现</b>：在社区帖子详细页面以及外层列表中添加“👍 赞同”动态交互组件。</li>
            </ol>
        `,
        status: 'PENDING_APPROVAL'
    });

    console.log('Task inserted successfully with ID:', taskId);
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
