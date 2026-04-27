import React from 'react';
import { Activity, BarChart2, Calendar, Settings, ShieldAlert, Trophy, BrainCircuit } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const navItems = [
    { id: 'today', icon: Calendar, label: '今日赛事' },
    { id: 'analysis', icon: BrainCircuit, label: '今日分析' },
    { id: 'model', icon: BarChart2, label: '数据模型' },
    { id: 'history', icon: Trophy, label: '实战记录' },
    { id: 'risk', icon: ShieldAlert, label: '风控管理' },
  ];

  return (
    <div className="w-64 bg-zinc-900/60 backdrop-blur-xl border-r border-zinc-800/50 h-screen flex flex-col text-zinc-300 relative z-20">
      <div className="p-6 flex items-center gap-3 text-emerald-400 font-bold text-xl tracking-tight">
        <Activity className="w-6 h-6" />
        <span>竞彩AI分析</span>
      </div>
      
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              activeTab === item.id 
                ? 'bg-zinc-800 text-white' 
                : 'hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-300'
            }`}
          >
            <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-emerald-400' : ''}`} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-zinc-800">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800/50 rounded-lg transition-colors text-zinc-400 hover:text-zinc-300">
          <Settings className="w-5 h-5" />
          <span className="font-medium">系统设置</span>
        </button>
      </div>
    </div>
  );
}
