import React from 'react';
import { Activity, BarChart2, Calendar, Settings, ShieldAlert, Trophy, BrainCircuit } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const navItems = [
    { id: 'today', icon: Calendar, label: '今日赛事', shortLabel: '赛事' },
    { id: 'analysis', icon: BrainCircuit, label: '今日分析', shortLabel: '分析' },
    { id: 'model', icon: BarChart2, label: '数据模型', shortLabel: '模型' },
    { id: 'history', icon: Trophy, label: '实战记录', shortLabel: '记录' },
    { id: 'risk', icon: ShieldAlert, label: '风控管理', shortLabel: '风控' },
  ];

  return (
    <>
      <div className="hidden md:flex w-64 bg-zinc-900/60 backdrop-blur-xl border-r border-zinc-800/50 h-[100dvh] flex-col text-zinc-300 relative z-40">
        <div className="p-6 flex items-center gap-3 text-emerald-400 font-bold text-xl tracking-tight shrink-0">
          <Activity className="w-6 h-6" />
          <span>竞彩AI分析</span>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
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
              <item.icon className={`w-5 h-5 flex-shrink-0 ${activeTab === item.id ? 'text-emerald-400' : ''}`} />
              <span className="font-medium whitespace-nowrap">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-800 shrink-0">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800/50 rounded-lg transition-colors text-zinc-400 hover:text-zinc-300">
            <Settings className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">系统设置</span>
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/50 flex justify-around items-center pt-2 pb-6 px-2 z-50">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
              activeTab === item.id 
                ? 'text-emerald-400 scale-110' 
                : 'text-zinc-500 hover:text-zinc-400'
            }`}
          >
            <item.icon className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">{item.shortLabel}</span>
          </button>
        ))}
      </div>
    </>
  );
}
