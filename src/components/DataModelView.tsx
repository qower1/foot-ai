import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Settings2, TrendingUp, Zap, Target, ShieldCheck, Database, Loader2, CheckCircle2, LineChart } from 'lucide-react';

const initialPerformanceData = [
  { month: '1月', roi: 5.2, winRate: 58 },
  { month: '2月', roi: 8.4, winRate: 62 },
  { month: '3月', roi: 12.1, winRate: 65 },
  { month: '4月', roi: 10.5, winRate: 61 },
  { month: '5月', roi: 15.8, winRate: 68 },
  { month: '6月', roi: 18.2, winRate: 70 },
];

interface ModelParams {
  evThreshold: number;
  kellyFraction: number;
  confidenceMin: number;
}

interface DataModelViewProps {
  params: ModelParams;
  onParamsChange: (params: ModelParams) => void;
}

export function DataModelView({ params, onParamsChange }: DataModelViewProps) {
  const { evThreshold, kellyFraction, confidenceMin } = params;
  
  const [isRetesting, setIsRetesting] = useState(false);
  const [chartData, setChartData] = useState(initialPerformanceData);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Dynamic stats based on parameters
  const [stats, setStats] = useState({
    accuracy: 68.4,
    valueBets: 142,
    leagues: 86
  });

  const handleRetest = () => {
    setIsRetesting(true);
    setShowSuccess(false);
    
    // Simulate API call for backtesting
    setTimeout(() => {
      // Generate slightly different data based on parameters
      const evFactor = (evThreshold - 1.05) * 5; // Higher EV = higher ROI but fewer bets
      const kellyFactor = (kellyFraction - 0.25) * 2; // Higher Kelly = higher variance/ROI
      const confFactor = (confidenceMin - 70) * 0.5; // Higher confidence = higher win rate
      
      const newData = initialPerformanceData.map(d => ({
        ...d,
        roi: Number((d.roi * (1 + evFactor + kellyFactor)).toFixed(1)),
        winRate: Number((d.winRate + confFactor + (evFactor * 2)).toFixed(1))
      }));
      
      setChartData(newData);
      
      // Update stats cards
      setStats({
        accuracy: Number((68.4 + confFactor + evFactor).toFixed(1)),
        valueBets: Math.max(10, Math.floor(142 - (evFactor * 50) - (confFactor * 2))),
        leagues: Math.max(20, Math.floor(86 - (confFactor * 0.5)))
      });
      
      setIsRetesting(false);
      setShowSuccess(true);
      
      setTimeout(() => setShowSuccess(false), 3000);
    }, 1500);
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 relative">
      {/* Success Toast */}
      {showSuccess && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 px-4 py-2 rounded-full flex items-center gap-2 shadow-lg shadow-emerald-500/10 animate-in fade-in slide-in-from-top-4 z-50">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-sm font-medium">回测完成！模型参数已更新并应用。</span>
        </div>
      )}
      
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Database className="w-6 h-6 text-emerald-500" />
              核心数据模型
            </h2>
            <p className="text-zinc-400 mt-1">基于泊松分布与凯利准则的AI深度学习模型</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => {
                onParamsChange({
                  evThreshold: 1.05,
                  kellyFraction: 0.25,
                  confidenceMin: 70
                });
                setChartData(initialPerformanceData);
                setStats({ accuracy: 68.4, valueBets: 142, leagues: 86 });
              }}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <Settings2 className="w-4 h-4" />
              模型参数重置
            </button>
            <button 
              onClick={handleRetest}
              disabled={isRetesting}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-lg transition-colors flex items-center gap-2 text-sm font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)] disabled:opacity-50"
            >
              {isRetesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {isRetesting ? '回测计算中...' : '应用并重新回测'}
            </button>
          </div>
        </div>

        {/* Model Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Target className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">泊松进球预测模型</h3>
                <p className="text-xs text-zinc-500">v2.4.1 (已激活)</p>
              </div>
            </div>
            <p className="text-sm text-zinc-400 mb-4">
              通过计算两队期望进球(xG)的泊松分布，并引入 Dixon-Coles 因子修正低比分平局，预测各比分发生的精确概率。
            </p>
            <div className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50 mb-4">
              <p className="text-xs text-zinc-500 font-mono mb-1">λ_home = (主xG/均xG) × (客xGA/均xGA) × 均进</p>
              <p className="text-xs text-zinc-500 font-mono mb-1">λ_away = (客xG/均xG) × (主xGA/均xGA) × 均进</p>
              <p className="text-xs text-purple-400/80 font-mono">τ(x,y) = 1 - ρ(1-x)(1-y) (Dixon-Coles)</p>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-500">准确率 (近30天)</span>
              <span className="text-emerald-400 font-bold">{stats.accuracy}%</span>
            </div>
          </div>

          <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">凯利方差与价值模型</h3>
                <p className="text-xs text-zinc-500">v3.0.2 (已激活)</p>
              </div>
            </div>
            <p className="text-sm text-zinc-400 mb-4">
              对比主流机构赔率与模型理论赔率，寻找期望价值 (EV &gt; 1) 的投注选项，并计算最佳投注比例。
            </p>
            <div className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50 mb-4">
              <p className="text-xs text-zinc-500 font-mono mb-1">Vig Removal (公平概率) = (1/赔率) / Margin</p>
              <p className="text-xs text-zinc-500 font-mono">EV = (真实概率 × 赔率) - 1</p>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-500">发现价值注数</span>
              <span className="text-purple-400 font-bold">{stats.valueBets} 注</span>
            </div>
          </div>

          <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-rose-500/10 rounded-lg">
                <LineChart className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">CLV & 亚盘核心引擎</h3>
                <p className="text-xs text-zinc-500">v1.0.0 (新上线)</p>
              </div>
            </div>
            <p className="text-sm text-zinc-400 mb-4">
              深挖低抽水 (2%-3%) 的亚洲让球盘，减少长期摩擦成本。追踪关盘线价值 (CLV)，确保预测赔率持续跑赢临场盘口。
            </p>
            <div className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50 mb-4">
              <p className="text-xs text-zinc-500 font-mono mb-1">Margin_AH ≈ 2.5% &lt; Margin_1X2 ≈ 6.5%</p>
              <p className="text-xs text-zinc-500 font-mono">CLV = (Odds_bet / Odds_close) - 1 &gt; 0</p>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-500">CLV 击败率</span>
              <span className="text-rose-400 font-bold">76.4%</span>
            </div>
          </div>

          <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <ShieldCheck className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">基本面 Elo 评级</h3>
                <p className="text-xs text-zinc-500">v1.8.5 (已激活)</p>
              </div>
            </div>
            <p className="text-sm text-zinc-400 mb-4">
              动态评估球队实力，结合伤停、战意、赛程密集度等因素，对基础概率进行修正。
            </p>
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-500">覆盖联赛</span>
              <span className="text-orange-400 font-bold">{stats.leagues} 个</span>
            </div>
          </div>
        </div>

        {/* Chart & Parameters */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Chart */}
          <div className="lg:col-span-2 bg-zinc-900/60 backdrop-blur-md border border-zinc-800/50 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-6">模型历史收益率 (ROI) 回测</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRoi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="month" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#e4e4e7', borderRadius: '8px' }}
                    itemStyle={{ color: '#10b981' }}
                  />
                  <Area type="monotone" dataKey="roi" name="累计收益率" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRoi)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Parameters */}
          <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/50 rounded-xl p-6 flex flex-col">
            <h3 className="text-lg font-bold text-white mb-6">策略参数微调</h3>
            
            <div className="space-y-6 flex-1">
              {/* Param 1 */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-zinc-300">最小期望价值 (Min EV)</label>
                  <span className="text-sm font-mono text-emerald-400">{evThreshold.toFixed(2)}</span>
                </div>
                <input 
                  type="range" 
                  min="1.01" max="1.20" step="0.01" 
                  value={evThreshold}
                  onChange={(e) => onParamsChange({ ...params, evThreshold: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <p className="text-xs text-zinc-500 mt-2">只有当计算出的期望价值大于此阈值时，才会推荐投注。值越高，推荐越谨慎。</p>
              </div>

              {/* Param 2 */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-zinc-300">凯利仓位缩放 (Kelly Fraction)</label>
                  <span className="text-sm font-mono text-emerald-400">{kellyFraction.toFixed(2)}</span>
                </div>
                <input 
                  type="range" 
                  min="0.1" max="1.0" step="0.05" 
                  value={kellyFraction}
                  onChange={(e) => onParamsChange({ ...params, kellyFraction: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <p className="text-xs text-zinc-500 mt-2">为了降低破产风险，通常采用部分凯利（如 0.25 即 1/4 凯利）来计算建议投注金额。</p>
              </div>

              {/* Param 3 */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-zinc-300">最低信心指数</label>
                  <span className="text-sm font-mono text-emerald-400">{confidenceMin}%</span>
                </div>
                <input 
                  type="range" 
                  min="50" max="95" step="1" 
                  value={confidenceMin}
                  onChange={(e) => onParamsChange({ ...params, confidenceMin: parseInt(e.target.value) })}
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <p className="text-xs text-zinc-500 mt-2">AI 综合评估的信心指数，低于此值的比赛将被过滤。</p>
              </div>
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
}
