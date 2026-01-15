import React from 'react';
import AtOrderChat from '../components/AtOrderChat';

const AtOrders: React.FC = () => {
    return (
        <div className="absolute inset-0 flex flex-col font-sans text-sm bg-[#f7f5f2] text-slate-900">
            <main className="flex-1 overflow-hidden flex flex-col p-4 md:p-6 gap-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex flex-col">
                        <h2 className="text-2xl font-light text-slate-800 tracking-[0.1em]">A&T 订单智能助手</h2>
                        <p className="text-xs text-slate-500 mt-1">Chat-with-Data: 状态查询与统计分析</p>
                    </div>
                </div>

                <div className="bg-white/60 backdrop-blur-md rounded-[2.5rem] border border-white/60 shadow-xl overflow-hidden flex flex-1 relative min-h-0 transition-all">
                    <AtOrderChat />
                </div>
            </main>
        </div>
    );
};

export default AtOrders;
