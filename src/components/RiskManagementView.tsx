import React, { useState, useEffect } from 'react';
import { HistoryRecord } from '../types';
import { ShieldAlert, Calculator, Wallet, AlertTriangle, TrendingDown, Settings, CheckCircle2, TrendingUp, PiggyBank } from 'lucide-react';

interface RiskManagementViewProps {
  records: HistoryRecord[];
  initialBankroll: number;
  onBankrollChange: (value: number) => void;
}

export function RiskManagementView({ records, initialBankroll, onBankrollChange }: RiskManagementViewProps) {
  // Bankroll settings
  const [maxSingleBet, setMaxSingleBet] = useState<number>(5); // %
  const [dailyStopLoss, setDailyStopLoss] = useState<number>(15); // %

  // Kelly Calculator state
  const [kellyOdds, setKellyOdds] = useState<number>(2.10);
  const [kellyProb, setKellyProb] = useState<number>(55); // %
  const [kellyResult, setKellyResult] = useState<number>(0);

  // Calculate Kelly Criterion
  useEffect(() => {
    const b = kellyOdds - 1;
    const p = kellyProb / 100;
    const q = 1 - p;
    
    if (b > 0) {
      const f = (b * p - q) / b;
      setKellyResult(f > 0 ? f * 100 : 0);
    } else {
      setKellyResult(0);
    }
  }, [kellyOdds, kellyProb]);

  // Calculate current bankroll and profit
  let currentBankroll = initialBankroll;
  let totalProfit = 0;

  const sortedRecords = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  for (const record of sortedRecords) {
    const stake = currentBankroll * record.strategy.suggestedStake;
    if (record.status === 'won') {
      const profit = stake * (record.strategy.totalOdds - 1);
      currentBankroll += profit;
      totalProfit += profit;
    } else if (record.status === 'lost') {
      currentBankroll -= stake;
      totalProfit -= stake;
    }
  }

  const profitPercentage = (totalProfit / initialBankroll) * 100;

  // Calculate Exposure
  const pendingRecords = records.filter(r => r.status === 'pending');
  const totalPendingStakePercent = pendingRecords.reduce((acc, curr) => acc + curr.strategy.suggestedStake * 100, 0);
  const totalPendingAmount = (totalPendingStakePercent / 100) * currentBankroll;
  
  const isOverExposure = totalPendingStakePercent > dailyStopLoss;

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-rose-500" />
              风控与资金管理
            </h2>
            <p className="text-zinc-400 mt-1">科学管理仓位，利用凯利公式优化长期收益</p>
          </div>
        </div>

        {/* Bankroll Dynamics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <PiggyBank className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-zinc-300 font-medium">初始本金 (Initial Bankroll)</h3>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-white">¥</span>
              <input 
                type="number" 
                value={initialBankroll}
                onChange={(e) => onBankrollChange(Number(e.target.value))}
                className="bg-transparent text-3xl font-bold text-white outline-none w-full border-b border-zinc-700 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Wallet className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-zinc-300 font-medium">当前本金 (Current Bankroll)</h3>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-white">¥</span>
              <span className="text-3xl font-bold text-white">{currentBankroll.toFixed(2)}</span>
            </div>
            <p className="text-xs text-zinc-500 mt-2">根据实战记录自动计算</p>
          </div>

          <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-lg ${totalProfit >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                {totalProfit >= 0 ? (
                  <TrendingUp className={`w-5 h-5 text-emerald-400`} />
                ) : (
                  <TrendingDown className={`w-5 h-5 text-rose-400`} />
                )}
              </div>
              <h3 className="text-zinc-300 font-medium">累计收益 (Total Profit)</h3>
            </div>
            <div className="flex items-end gap-2">
              <span className={`text-3xl font-bold ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)}
              </span>
            </div>
            <p className={`text-xs mt-2 font-bold ${totalProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              收益率: {totalProfit >= 0 ? '+' : ''}{profitPercentage.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Risk Settings Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Settings className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-zinc-300 font-medium">单注上限 (Max Single)</h3>
            </div>
            <div className="flex items-end gap-2">
              <input 
                type="number" 
                value={maxSingleBet}
                onChange={(e) => setMaxSingleBet(Number(e.target.value))}
                className="bg-transparent text-3xl font-bold text-white outline-none w-24 border-b border-zinc-700 focus:border-amber-500 transition-colors"
              />
              <span className="text-xl font-bold text-zinc-500 mb-1">%</span>
            </div>
            <p className="text-xs text-zinc-500 mt-2">建议不超过 5%</p>
          </div>

          <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-rose-500/10 rounded-lg">
                <TrendingDown className="w-5 h-5 text-rose-400" />
              </div>
              <h3 className="text-zinc-300 font-medium">单日止损 (Daily Stop)</h3>
            </div>
            <div className="flex items-end gap-2">
              <input 
                type="number" 
                value={dailyStopLoss}
                onChange={(e) => setDailyStopLoss(Number(e.target.value))}
                className="bg-transparent text-3xl font-bold text-white outline-none w-24 border-b border-zinc-700 focus:border-rose-500 transition-colors"
              />
              <span className="text-xl font-bold text-zinc-500 mb-1">%</span>
            </div>
            <p className="text-xs text-zinc-500 mt-2">建议不超过 15%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Kelly Criterion Calculator */}
          <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Calculator className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-bold text-white">凯利公式计算器</h3>
            </div>
            <p className="text-sm text-zinc-400 mb-6">
              根据赔率和胜率计算最佳投注比例。公式：f* = (bp - q) / b
            </p>

            <div className="space-y-6">
              <div>
                <label className="flex justify-between text-sm text-zinc-400 mb-2">
                  <span>包含本金的赔率 (Decimal Odds)</span>
                  <span className="font-mono text-white">{kellyOdds.toFixed(2)}</span>
                </label>
                <input 
                  type="range" 
                  min="1.1" max="5.0" step="0.05"
                  value={kellyOdds}
                  onChange={(e) => setKellyOdds(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>

              <div>
                <label className="flex justify-between text-sm text-zinc-400 mb-2">
                  <span>预估胜率 (Probability)</span>
                  <span className="font-mono text-white">{kellyProb}%</span>
                </label>
                <input 
                  type="range" 
                  min="1" max="99" step="1"
                  value={kellyProb}
                  onChange={(e) => setKellyProb(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>

              <div className="pt-6 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300 font-medium">建议投注比例 (Kelly Fraction)</span>
                  <span className={`text-3xl font-bold font-mono ${kellyResult > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {kellyResult.toFixed(2)}%
                  </span>
                </div>
                {kellyResult > maxSingleBet && (
                  <div className="mt-3 flex items-start gap-2 text-xs text-amber-500 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <p>计算结果 ({kellyResult.toFixed(2)}%) 超过了您设置的单注上限 ({maxSingleBet}%)。建议严格执行单注上限，或采用半凯利 (Half-Kelly) 策略以降低破产风险。</p>
                  </div>
                )}
                {kellyResult === 0 && (
                  <div className="mt-3 flex items-start gap-2 text-xs text-rose-400 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <p>期望值为负 (EV &lt; 0)，该选项没有投注价值，建议放弃 (Pass)。</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Current Exposure Analysis */}
          <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/50 rounded-xl p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle className={`w-5 h-5 ${isOverExposure ? 'text-rose-500' : 'text-emerald-400'}`} />
              <h3 className="text-lg font-bold text-white">当前风险敞口</h3>
            </div>
            
            <div className="flex-1 flex flex-col justify-center">
              <div className="text-center mb-8">
                <div className="text-sm text-zinc-400 mb-2">待开奖总仓位</div>
                <div className={`text-5xl font-bold font-mono ${isOverExposure ? 'text-rose-500' : 'text-emerald-400'}`}>
                  {totalPendingStakePercent.toFixed(1)}%
                </div>
                <div className="text-zinc-500 mt-2 font-mono">
                  ≈ ¥{totalPendingAmount.toFixed(2)}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">待开奖订单数</span>
                  <span className="text-white font-bold">{pendingRecords.length} 单</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">单日止损线</span>
                  <span className="text-white font-bold">{dailyStopLoss}%</span>
                </div>
                
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden mt-2">
                  <div 
                    className={`h-full rounded-full ${isOverExposure ? 'bg-rose-500' : 'bg-emerald-400'}`}
                    style={{ width: `${Math.min((totalPendingStakePercent / dailyStopLoss) * 100, 100)}%` }}
                  />
                </div>
              </div>

              {isOverExposure ? (
                <div className="mt-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                  <p className="text-sm text-rose-400 flex items-center gap-2 font-medium">
                    <ShieldAlert className="w-4 h-4" />
                    警告：当前敞口已超过单日止损线！
                  </p>
                  <p className="text-xs text-rose-400/80 mt-1">
                    建议停止新增投注，等待现有订单结算。过度暴露可能导致严重的资金回撤。
                  </p>
                </div>
              ) : (
                <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <p className="text-sm text-emerald-400 flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    风险可控
                  </p>
                  <p className="text-xs text-emerald-400/80 mt-1">
                    当前仓位在安全范围内。剩余可用风险额度：{Math.max(0, dailyStopLoss - totalPendingStakePercent).toFixed(1)}%。
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
