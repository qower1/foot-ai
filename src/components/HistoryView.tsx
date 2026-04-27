import React, { useMemo, useState } from 'react';
import { HistoryRecord } from '../types';
import { Trophy, Calendar, TrendingUp, CheckCircle2, XCircle, Clock, Trash2, Target, BarChart3, LineChart as LineChartIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface HistoryViewProps {
  records: HistoryRecord[];
  initialBankroll: number;
  onDeleteRecord: (id: string) => void;
  onUpdateStatus: (id: string, status: 'won' | 'lost' | 'pending') => void;
  onClearAllRecords?: () => void;
}

const getRecommendationLabel = (rec: string) => {
  const labels: Record<string, string> = {
    home: '主胜',
    draw: '平局',
    away: '客胜',
    letHome: '让胜',
    letDraw: '让平',
    letAway: '让负',
    over: '大球',
    under: '小球',
    pass: '放弃'
  };
  return labels[rec] || rec.toUpperCase();
};

export function HistoryView({ records, initialBankroll, onDeleteRecord, onUpdateStatus, onClearAllRecords }: HistoryViewProps) {
  const [chartType, setChartType] = useState<'cumulative' | 'daily' | 'monthly'>('cumulative');

  const stats = useMemo(() => {
    const completed = records.filter(r => r.status !== 'pending');
    const won = completed.filter(r => r.status === 'won');
    const lost = completed.filter(r => r.status === 'lost');
    
    const winRate = completed.length > 0 ? (won.length / completed.length) * 100 : 0;
    
    // Use initialBankroll from props
    let totalProfit = 0;
    let totalStake = 0;
    let totalOddsWon = 0;
    
    const chartDataCumulative: any[] = [];
    const dailyDataMap = new Map<string, number>();
    const monthlyDataMap = new Map<string, number>();

    let cumulativeProfit = 0;
    let currentBankroll = initialBankroll;

    // Sort ascending for chart
    const sortedCompleted = [...completed].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedCompleted.forEach((record) => {
      const stakeAmount = currentBankroll * record.strategy.suggestedStake;
      totalStake += stakeAmount;
      
      let profit = 0;
      if (record.status === 'won') {
        profit = stakeAmount * (record.strategy.totalOdds - 1);
        totalProfit += profit;
        cumulativeProfit += profit;
        totalOddsWon += record.strategy.totalOdds;
        currentBankroll += profit;
      } else if (record.status === 'lost') {
        profit = -stakeAmount;
        totalProfit += profit;
        cumulativeProfit += profit;
        currentBankroll += profit;
      }
      
      const dateObj = new Date(record.date);
      const dayKey = dateObj.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
      const monthKey = dateObj.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short' });

      chartDataCumulative.push({
        date: dayKey,
        profit: cumulativeProfit,
        name: record.strategy.type === 'single' ? '单关' : '串关'
      });

      dailyDataMap.set(dayKey, (dailyDataMap.get(dayKey) || 0) + profit);
      monthlyDataMap.set(monthKey, (monthlyDataMap.get(monthKey) || 0) + profit);
    });

    const chartDataDaily = Array.from(dailyDataMap.entries()).map(([date, profit]) => ({ date, profit }));
    const chartDataMonthly = Array.from(monthlyDataMap.entries()).map(([date, profit]) => ({ date, profit }));

    const roi = initialBankroll > 0 ? (totalProfit / initialBankroll) * 100 : 0;
    const avgOdds = won.length > 0 ? totalOddsWon / won.length : 0;

    return {
      totalMatches: records.length,
      completedMatches: completed.length,
      wonCount: won.length,
      lostCount: lost.length,
      winRate,
      totalProfit,
      roi,
      avgOdds,
      chartDataCumulative,
      chartDataDaily,
      chartDataMonthly
    };
  }, [records, initialBankroll]);

  if (records.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 h-full">
        <Trophy className="w-16 h-16 mb-4 text-zinc-700" />
        <p className="text-lg font-medium text-zinc-400">暂无实战记录</p>
        <p className="text-sm mt-2">在“今日赛事”中进行AI分析后，可将策略保存至账本。</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-500" />
              实战记录账本
            </h2>
            <p className="text-zinc-400 mt-1">追踪您的AI推荐历史与盈亏表现</p>
          </div>
          {onClearAllRecords && (
            <button
              onClick={onClearAllRecords}
              className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-medium rounded-lg transition-colors border border-rose-500/20"
            >
              <Trash2 className="w-4 h-4" />
              清空记录
            </button>
          )}
        </div>

        {/* 详细实战数据分析 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/50 rounded-xl p-5">
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm">总盈亏</span>
            </div>
            <span className={`text-2xl font-bold ${stats.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {stats.totalProfit > 0 ? '+' : ''}¥{stats.totalProfit.toFixed(2)}
            </span>
          </div>
          <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/50 rounded-xl p-5">
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">投资回报率 (ROI)</span>
            </div>
            <span className={`text-2xl font-bold ${stats.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {stats.roi > 0 ? '+' : ''}{stats.roi.toFixed(1)}%
            </span>
          </div>
          <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/50 rounded-xl p-5">
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <Target className="w-4 h-4" />
              <span className="text-sm">胜率 ({stats.completedMatches}场已结)</span>
            </div>
            <span className="text-2xl font-bold text-white">
              {stats.winRate.toFixed(1)}%
            </span>
          </div>
          <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/50 rounded-xl p-5">
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <Trophy className="w-4 h-4" />
              <span className="text-sm">红黑统计</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-emerald-400">{stats.wonCount}红</span>
              <span className="text-zinc-600">/</span>
              <span className="text-2xl font-bold text-rose-400">{stats.lostCount}黑</span>
            </div>
          </div>
          <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/50 rounded-xl p-5">
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm">平均命中赔率</span>
            </div>
            <span className="text-2xl font-bold text-amber-400">
              {stats.avgOdds.toFixed(2)}
            </span>
          </div>
        </div>

        {/* 收益曲线 */}
        {stats.chartDataCumulative.length > 0 && (
          <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/50 rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <LineChartIcon className="w-4 h-4" />
                收益曲线
              </h3>
              <div className="flex items-center bg-zinc-800/50 rounded-lg p-1">
                <button
                  onClick={() => setChartType('cumulative')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${chartType === 'cumulative' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-300'}`}
                >
                  累计收益
                </button>
                <button
                  onClick={() => setChartType('daily')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${chartType === 'daily' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-300'}`}
                >
                  日收益
                </button>
                <button
                  onClick={() => setChartType('monthly')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${chartType === 'monthly' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-300'}`}
                >
                  月收益
                </button>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={
                    chartType === 'cumulative' ? stats.chartDataCumulative :
                    chartType === 'daily' ? stats.chartDataDaily :
                    stats.chartDataMonthly
                  } 
                  margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                  <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value > 0 ? '+' : ''}${value}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#e4e4e7' }}
                    itemStyle={{ color: '#34d399' }}
                    formatter={(value: number) => [`${value > 0 ? '+' : ''}¥${value.toFixed(2)}`, chartType === 'cumulative' ? '累计盈亏' : '期间盈亏']}
                    labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
                  />
                  <ReferenceLine y={0} stroke="#52525b" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="profit" stroke="#34d399" strokeWidth={3} dot={{ r: 4, fill: '#18181b', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#34d399' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {records.map((record) => (
            <div key={record.id} className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/50 rounded-xl p-6 transition-all hover:border-zinc-700/50">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zinc-800 rounded-lg">
                    <Calendar className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {new Date(record.date).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </h3>
                    <div className="flex items-center gap-2 text-sm mt-1">
                      <span className="text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded font-medium">
                        {record.strategy.type === 'single' ? '单关价值投' : '高赔率串关'}
                      </span>
                      <span className="text-zinc-500">包含 {record.predictions.length} 场预测</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={record.status}
                    onChange={(e) => onUpdateStatus(record.id, e.target.value as any)}
                    className={`text-sm font-bold px-3 py-1.5 rounded-lg border outline-none appearance-none cursor-pointer ${
                      record.status === 'won' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      record.status === 'lost' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                      'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}
                  >
                    <option value="pending" className="bg-zinc-900 text-amber-400">待开奖 (Pending)</option>
                    <option value="won" className="bg-zinc-900 text-emerald-400">红单 (Won)</option>
                    <option value="lost" className="bg-zinc-900 text-rose-400">黑单 (Lost)</option>
                  </select>
                  
                  <button 
                    onClick={() => onDeleteRecord(record.id)}
                    className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors"
                    title="删除记录"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-zinc-800/30 rounded-lg border border-zinc-800">
                <div>
                  <span className="block text-xs text-zinc-500 mb-1">组合赔率</span>
                  <span className="font-mono font-bold text-white">{record.strategy.totalOdds.toFixed(2)}</span>
                </div>
                <div>
                  <span className="block text-xs text-zinc-500 mb-1">建议仓位</span>
                  <span className="font-mono font-bold text-rose-400">{(record.strategy.suggestedStake * 100).toFixed(1)}%</span>
                </div>
                <div>
                  <span className="block text-xs text-zinc-500 mb-1">预期回报</span>
                  <span className="font-mono font-bold text-emerald-400">{(record.strategy.expectedReturn * 100).toFixed(1)}%</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  策略逻辑
                </h4>
                <p className="text-sm text-zinc-300 leading-relaxed bg-zinc-800/50 p-3 rounded-lg border border-zinc-700/50">
                  {record.strategy.reasoning}
                </p>
              </div>

              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  推荐详情
                </h4>
                <div className="space-y-2">
                  {record.strategy.matches.map((matchId) => {
                    const pred = record.predictions.find(p => p.matchId === matchId);
                    const match = record.matches?.find(m => m.id === matchId);
                    if (!pred) return null;
                    
                    return (
                      <div key={matchId} className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                        <div className="flex flex-col">
                          <span className="text-sm text-zinc-300">
                            {match ? (
                              <>
                                {match.matchNum && <span className="text-zinc-500 mr-2 font-mono">[{match.matchNum}]</span>}
                                {match.homeTeam} vs {match.awayTeam}
                              </>
                            ) : (
                              <span className="font-mono text-zinc-500">ID: {matchId}</span>
                            )}
                          </span>
                          <span className="text-xs text-zinc-500 mt-1">{pred.reasoning}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-zinc-400">EV: {pred.expectedValue > 1 ? pred.expectedValue.toFixed(2) : '-'}</span>
                          <span className={`text-xs font-bold px-2 py-1 rounded ${
                            pred.recommendation === 'pass' ? 'bg-zinc-700 text-zinc-300' : 'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {getRecommendationLabel(pred.recommendation)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
