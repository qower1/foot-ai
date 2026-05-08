import React, { useMemo, useState } from 'react';
import { HistoryRecord } from '../types';
import { Trophy, Calendar, TrendingUp, CheckCircle2, XCircle, Clock, Trash2, Target, BarChart3, LineChart as LineChartIcon, Download } from 'lucide-react';
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

  // 只展示/记录 2串1 的推荐
  const displayRecords = useMemo(() => {
    return records.filter(r => r.strategy.matches.length === 2);
  }, [records]);

  const stats = useMemo(() => {
    const completed = displayRecords.filter(r => r.status !== 'pending');
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
      const isPercent = record.strategy.suggestedStake <= 1 && record.strategy.suggestedStake > 0;
      const stakeAmount = isPercent ? currentBankroll * record.strategy.suggestedStake : record.strategy.suggestedStake;
      
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
      totalMatches: displayRecords.length,
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
  }, [displayRecords, initialBankroll]);

  const recordDetails = useMemo(() => {
    let bankroll = initialBankroll;
    const sorted = [...displayRecords].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const map = new Map<string, { stake: number; pnl: number }>();
    
    sorted.forEach((record) => {
      const isPercent = record.strategy.suggestedStake <= 1 && record.strategy.suggestedStake > 0;
      const stakeAmount = isPercent ? bankroll * record.strategy.suggestedStake : record.strategy.suggestedStake;
      
      let pnl = 0;
      if (record.status === 'won') {
        pnl = stakeAmount * (record.strategy.totalOdds - 1);
        bankroll += pnl;
      } else if (record.status === 'lost') {
        pnl = -stakeAmount;
        bankroll += pnl;
      }
      
      map.set(record.id, { stake: stakeAmount, pnl });
    });
    return map;
  }, [displayRecords, initialBankroll]);

  const handleExportExcel = () => {
    const tableRows = displayRecords.map(record => {
      const date = new Date(record.date).toLocaleDateString('zh-CN');
      
      const strategyPredictions = record.predictions.filter(p => record.strategy.matches.includes(p.matchId));
      
      const leagues = strategyPredictions.map(p => {
        const match = record.matches?.find(m => m.id === p.matchId);
        return match?.league || '-';
      }).join(' + ');
      
      const matchesText = strategyPredictions.map(p => {
        const match = record.matches?.find(m => m.id === p.matchId);
        return match ? `${match.homeTeam} vs ${match.awayTeam}` : '未知';
      }).join(' + ');
      
      const recommendations = strategyPredictions.map(p => getRecommendationLabel(p.recommendation)).join(' + ');
      
      const details = recordDetails.get(record.id) || { stake: 0, pnl: 0 };
      const stakeFormatted = details.stake.toFixed(2);
      const odds = record.strategy.totalOdds.toFixed(2);
      
      const resultStr = record.status === 'won' ? '红' : record.status === 'lost' ? '黑' : '待定';
      
      const pnlFormatted = record.status === 'pending' ? '0.00' : details.pnl.toFixed(2);
      
      // bg-rose-500/10 vs bg-emerald-500/10 -> equivalent colors for excel
      const rowClass = record.status === 'won' ? 'won' : record.status === 'lost' ? 'lost' : '';
      
      return `
        <tr class="${rowClass}">
          <td>${date}</td>
          <td>${leagues}</td>
          <td>${matchesText}</td>
          <td>${recommendations}</td>
          <td style="mso-number-format:'0.00';">${stakeFormatted}</td>
          <td style="mso-number-format:'0.00';">${odds}</td>
          <td class="bold">${resultStr}</td>
          <td class="bold" style="mso-number-format:'0.00';">${pnlFormatted}</td>
        </tr>
      `;
    });
    
    const htmlTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>实战记录</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; font-family: sans-serif; white-space: nowrap; }
          th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
          .won { background-color: #ffe4e6; color: #e11d48; }
          .lost { background-color: #d1fae5; color: #059669; }
          .bold { font-weight: bold; }
          th { background-color: #f4f4f5; color: #3f3f46; font-weight: bold; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              <th>日期</th>
              <th>联赛</th>
              <th>场次</th>
              <th>推荐方向</th>
              <th>投入金额(元)</th>
              <th>组合赔率</th>
              <th>赛果</th>
              <th>盈亏(元)</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows.join('')}
          </tbody>
          <tfoot>
            <tr style="background-color: #f4f4f5; font-weight: bold;">
              <td colspan="4" style="text-align: right;">汇总：</td>
              <td></td>
              <td>均赔: ${stats.avgOdds.toFixed(2)}</td>
              <td style="color: #059669;">胜率: ${stats.winRate.toFixed(1)}%</td>
              <td style="color: ${stats.totalProfit > 0 ? '#e11d48' : stats.totalProfit < 0 ? '#059669' : '#3f3f46'};">
                总盈亏: ${stats.totalProfit > 0 ? '+' : ''}${stats.totalProfit.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </body>
      </html>
    `;
    
    const blob = new Blob([htmlTemplate], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `实战记录_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '')}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


  if (displayRecords.length === 0) {
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
              实战记录账本
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">追踪您的AI推荐历史与盈亏表现</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={handleExportExcel}
              className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-medium rounded-lg transition-colors border border-emerald-500/20"
            >
              <Download className="w-4 h-4" />
              导出报表
            </button>
            {onClearAllRecords && (
              <button
                onClick={onClearAllRecords}
                className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-medium rounded-lg transition-colors border border-rose-500/20"
              >
                <Trash2 className="w-4 h-4" />
                清空记录
              </button>
            )}
          </div>
        </div>

        {/* 详细实战数据分析 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/50 rounded-xl p-3 sm:p-5">
            <div className="flex items-center gap-1.5 text-zinc-400 mb-1 sm:mb-2">
              <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">总盈亏</span>
            </div>
            <span className={`text-lg sm:text-2xl font-bold ${stats.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {stats.totalProfit > 0 ? '+' : ''}¥{stats.totalProfit.toFixed(2)}
            </span>
          </div>
          <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/50 rounded-xl p-3 sm:p-5">
            <div className="flex items-center gap-1.5 text-zinc-400 mb-1 sm:mb-2">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">投资回报率</span>
            </div>
            <span className={`text-lg sm:text-2xl font-bold ${stats.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {stats.roi > 0 ? '+' : ''}{stats.roi.toFixed(1)}%
            </span>
          </div>
          <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/50 rounded-xl p-3 sm:p-5">
            <div className="flex items-center gap-1.5 text-zinc-400 mb-1 sm:mb-2">
              <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 hover:group text-nowrap whitespace-nowrap" />
              <span className="text-xs sm:text-sm whitespace-nowrap overflow-hidden text-ellipsis">胜率 ({stats.completedMatches}场)</span>
            </div>
            <span className="text-lg sm:text-2xl font-bold text-white">
              {stats.winRate.toFixed(1)}%
            </span>
          </div>
          <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/50 rounded-xl p-3 sm:p-5">
            <div className="flex items-center gap-1.5 text-zinc-400 mb-1 sm:mb-2">
              <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">红黑</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-lg sm:text-2xl font-bold text-emerald-400">{stats.wonCount}</span>
              <span className="text-zinc-600">/</span>
              <span className="text-lg sm:text-2xl font-bold text-rose-400">{stats.lostCount}</span>
            </div>
          </div>
          <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/50 rounded-xl p-3 sm:p-5">
            <div className="flex items-center gap-1.5 text-zinc-400 mb-1 sm:mb-2">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm whitespace-nowrap">平均赔率</span>
            </div>
            <span className="text-lg sm:text-2xl font-bold text-amber-400">
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

        <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/50 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-zinc-800/50 text-zinc-400">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">日期</th>
                  <th className="px-4 py-3 whitespace-nowrap">联赛</th>
                  <th className="px-4 py-3 whitespace-nowrap">场次</th>
                  <th className="px-4 py-3 whitespace-nowrap">推荐方向</th>
                  <th className="px-4 py-3 whitespace-nowrap text-right">投入金额</th>
                  <th className="px-4 py-3 whitespace-nowrap text-right">组合赔率</th>
                  <th className="px-4 py-3 whitespace-nowrap">赛果</th>
                  <th className="px-4 py-3 whitespace-nowrap text-right">盈亏</th>
                  <th className="px-4 py-3 whitespace-nowrap text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {displayRecords.map((record) => {
                  const date = new Date(record.date).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
                  
                  const strategyPredictions = record.predictions.filter(p => record.strategy.matches.includes(p.matchId));
                  
                  const leagues = strategyPredictions.map(p => {
                    const match = record.matches?.find(m => m.id === p.matchId);
                    return match?.league || '-';
                  }).join(', ');
                  
                  const matchesText = strategyPredictions.map((p, i) => {
                    const match = record.matches?.find(m => m.id === p.matchId);
                    return <div key={i} className="whitespace-nowrap">{match ? `${match.homeTeam} vs ${match.awayTeam}` : '未知'}</div>;
                  });
                  
                  const recommendations = strategyPredictions.map((p, i) => (
                    <div key={i}>{getRecommendationLabel(p.recommendation)}</div>
                  ));
                  
  const details = recordDetails.get(record.id) || { stake: 0, pnl: 0 };
                  const stake = details.stake.toFixed(2);
                  const odds = record.strategy.totalOdds.toFixed(2);
                  
                  const pnl = details.pnl;

                  return (
                    <tr key={record.id} className={`transition-colors group ${
                      record.status === 'won' ? 'bg-rose-500/10 hover:bg-rose-500/20' : 
                      record.status === 'lost' ? 'bg-emerald-500/10 hover:bg-emerald-500/20' : 
                      'hover:bg-zinc-800/20'
                    }`}>
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-300">{date}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-400">{leagues}</td>
                      <td className="px-4 py-3 text-zinc-300 font-medium">{matchesText}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-emerald-400/90 font-medium">{recommendations}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-right font-mono text-zinc-300">{stake}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-right font-mono text-amber-400/90">{odds}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <select
                          value={record.status}
                          onChange={(e) => onUpdateStatus(record.id, e.target.value as any)}
                          className={`text-xs font-bold px-2 py-1 rounded border outline-none appearance-none cursor-pointer ${
                            record.status === 'won' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                            record.status === 'lost' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          <option value="pending" className="bg-zinc-900 text-amber-400">待定</option>
                          <option value="won" className="bg-zinc-900 text-rose-400">红</option>
                          <option value="lost" className="bg-zinc-900 text-emerald-400">黑</option>
                        </select>
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-right font-bold font-mono ${pnl > 0 ? 'text-rose-400' : pnl < 0 ? 'text-emerald-400' : 'text-zinc-500'}`}>
                        {record.status === 'pending' ? '-' : `${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}`}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <button 
                          onClick={() => onDeleteRecord(record.id)}
                          className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-400/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                          title="删除记录"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-zinc-800/50 text-zinc-300 font-medium">
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-right">汇总：</td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-amber-400/90 font-mono">均赔: {stats.avgOdds.toFixed(2)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-emerald-400">胜率: {stats.winRate.toFixed(1)}%</td>
                  <td className={`px-4 py-3 whitespace-nowrap text-right font-bold font-mono ${stats.totalProfit > 0 ? 'text-rose-400' : stats.totalProfit < 0 ? 'text-emerald-400' : 'text-zinc-300'}`}>
                    总盈亏: {stats.totalProfit > 0 ? '+' : ''}{stats.totalProfit.toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
