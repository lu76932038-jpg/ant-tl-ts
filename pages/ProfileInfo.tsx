import React from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Shield, Calendar, IdCard } from 'lucide-react';

const ProfileInfo: React.FC = () => {
    const { user } = useAuth();

    const infoItems = [
        { label: '用户名', value: user?.username, icon: <User className="w-5 h-5" />, color: 'bg-gray-100 text-gray-600' },
        { label: '注册邮箱', value: user?.email || '未设置', icon: <Mail className="w-5 h-5" />, color: 'bg-gray-100 text-gray-600' },
        { label: '账户角色', value: user?.role === 'admin' ? '系统管理员' : '普通用户', icon: <Shield className="w-5 h-5" />, color: 'bg-[#2c2c2c] text-white' },
        { label: '员工编号', value: `TS-${user?.id?.toString().padStart(4, '0')}`, icon: <IdCard className="w-5 h-5" />, color: 'bg-gray-100 text-gray-600' },
    ];

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-light text-slate-800 tracking-[0.1em]">基本信息</h2>
                <p className="text-slate-400 font-medium">查看您的账户资料与权限设置</p>
            </div>

            <div className="bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white/40 shadow-xl overflow-hidden">
                <div className="bg-[#2c2c2c] h-32 relative">
                    <div className="absolute -bottom-12 left-10 p-2 bg-white rounded-3xl shadow-lg border border-slate-100">
                        <div className="w-24 h-24 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                            <User className="w-12 h-12" />
                        </div>
                    </div>
                </div>

                <div className="pt-20 pb-10 px-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {infoItems.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-6 p-6 bg-slate-50 border border-slate-100 rounded-2xl group hover:bg-white hover:shadow-lg hover:border-blue-100 transition-all duration-300">
                                <div className={`p-4 rounded-xl ${item.color} shadow-sm group-hover:scale-110 transition-transform`}>
                                    {item.icon}
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                                    <p className="text-lg font-bold text-slate-800">{item.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-8 bg-white/40 border border-white/40 rounded-[2.5rem] flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#2c2c2c] text-white rounded-2xl shadow-lg shadow-gray-400/20">
                        <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-800">账户状态: 已激活</p>
                        <p className="text-xs text-slate-500 font-medium tracking-tight">您的账户目前处于受保护的审计模式</p>
                    </div>
                </div>
                <button className="px-6 py-3 bg-white border border-gray-200 text-[#2c2c2c] font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-black hover:text-white transition-colors">
                    查看完整协议
                </button>
            </div>
        </div>
    );
};

export default ProfileInfo;
