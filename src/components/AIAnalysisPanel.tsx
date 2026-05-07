import React, { useRef, useState } from 'react';
import { Prediction, BettingStrategy, Match } from '../types';
import { BrainCircuit, TrendingUp, AlertTriangle, CheckCircle2, Download, Loader2, Save } from 'lucide-react';
import { motion } from 'motion/react';
import { toPng } from 'html-to-image';

interface AIAnalysisPanelProps {
  predictions: Prediction[];
  strategy: BettingStrategy;
  matches: Match[];
  onClose: () => void;
  onSaveHistory?: () => void;
}

const getRecommendationDisplay = (rec: string, match: Match) => {
  const lp = match.letOdds?.letCount;
  const lpStr = lp && lp > 0 ? `+${lp}` : `${lp || 0}`;

  switch (rec) {
    case 'home': return `${match.homeTeam} 主胜 @${match.odds?.home.toFixed(2) || '-'}`;
    case 'draw': return `平局 @${match.odds?.draw.toFixed(2) || '-'}`;
    case 'away': return `${match.awayTeam} 客胜 @${match.odds?.away.toFixed(2) || '-'}`;
    case 'letHome': return `${match.homeTeam} (${lpStr}) 让球主胜 @${match.letOdds?.home.toFixed(2) || '-'}`;
    case 'letDraw': return `让球平局 (${lpStr}) @${match.letOdds?.draw.toFixed(2) || '-'}`;
    case 'letAway': return `${match.awayTeam} (${lpStr}) 让球客胜 @${match.letOdds?.away.toFixed(2) || '-'}`;
    case 'over': return '大球';
    case 'under': return '小球';
    case 'pass': return '放弃';
    default: return `${rec} @${match.odds?.home?.toFixed(2) || '-'}`;
  }
};

export function AIAnalysisPanel({ predictions, strategy, matches, onClose, onSaveHistory }: AIAnalysisPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleExportImage = async () => {
    if (!panelRef.current) return;
    
    try {
      setIsExporting(true);
      
      const scrollContainer = panelRef.current.parentElement;
      let originalOverflow = '';
      let originalHeight = '';
      
      if (scrollContainer) {
        originalOverflow = scrollContainer.style.overflow;
        originalHeight = scrollContainer.style.height;
        scrollContainer.style.overflow = 'visible';
        scrollContainer.style.height = 'auto';
      }
      
      // Wait a tick for DOM to update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const dataUrl = await toPng(panelRef.current, {
        backgroundColor: '#18181b', // zinc-900
        pixelRatio: 2, // Higher resolution
        width: panelRef.current.scrollWidth,
        height: panelRef.current.scrollHeight,
        style: {
          margin: '0',
          transform: 'none'
        }
      });
      
      if (scrollContainer) {
        scrollContainer.style.overflow = originalOverflow;
        scrollContainer.style.height = originalHeight;
      }
      
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `AI分析报告_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.png`;
      link.click();
    } catch (error) {
      console.error('Failed to export image:', error);
      alert('导出图片失败，请重试。');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSave = () => {
    if (onSaveHistory && !isSaved) {
      onSaveHistory();
      setIsSaved(true);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-zinc-900/80 backdrop-blur-xl border-l border-zinc-800/50 shadow-2xl overflow-y-auto z-50 flex flex-col"
    >
      <div ref={panelRef} className="p-6 flex flex-col gap-6 min-h-full">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
            <BrainCircuit className="w-6 h-6" />
            AI 深度分析报告
          </h2>
          <div className="flex items-center gap-2">
            {onSaveHistory && (
              <button 
                onClick={handleSave} 
                disabled={isSaved}
                className={`p-2 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium ${
                  isSaved 
                    ? 'text-emerald-400 bg-emerald-400/10 cursor-default' 
                    : 'text-zinc-400 hover:text-emerald-400 hover:bg-emerald-400/10'
                }`}
                title="保存到实战记录"
              >
                {isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                <span className="hidden sm:inline">{isSaved ? '已保存' : '保存'}</span>
              </button>
            )}
            <button 
              onClick={handleExportImage} 
              disabled={isExporting}
              className="p-2 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors disabled:opacity-50"
              title="导出为图片"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            </button>
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors">
              &times;
            </button>
          </div>
        </div>

        <div className="bg-zinc-800/50 rounded-xl p-5 border border-zinc-700/50">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            今日投注策略
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-400">策略类型</span>
              <span className="font-mono font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                {strategy.type === 'single' ? '单关价值投' : '高赔率串关'}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-400">组合赔率</span>
              <span className="font-mono font-bold text-zinc-200">{strategy.totalOdds.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-400">建议仓位</span>
              <span className="font-mono font-bold text-rose-400">{(strategy.suggestedStake * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-400">预期回报</span>
              <span className="font-mono font-bold text-emerald-400">{(strategy.expectedReturn * 100).toFixed(1)}%</span>
            </div>
            
            <div className="pt-4 border-t border-zinc-700/50">
              <h4 className="text-sm font-medium text-zinc-400 mb-3">推荐场次</h4>
              <div className="space-y-2 mb-4">
                {strategy.matches.map(matchId => {
                  const match = matches.find(m => m.id === matchId);
                  const pred = predictions.find(p => p.matchId === matchId);
                  if (!match || !pred) return null;
                  return (
                    <div key={matchId} className="flex flex-col gap-3 bg-zinc-800/30 p-3 rounded-lg border border-zinc-700/50">
                      <div className="flex justify-between items-start gap-4">
                        <span className="text-sm text-zinc-300 font-medium flex-1">
                          {match.matchNum && <span className="text-zinc-500 mr-1 font-mono">[{match.matchNum}]</span>}
                          {match.homeTeam} vs {match.awayTeam}
                        </span>
                        <div className="flex flex-col items-end gap-1 shrink-0 text-right max-w-[200px] sm:max-w-[300px]">
                          <span className={`text-xs font-bold px-2 py-1.5 rounded inline-block whitespace-normal break-words leading-tight ${
                            pred.recommendation === 'pass' ? 'bg-zinc-700 text-zinc-300' : 'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {getRecommendationDisplay(pred.recommendation, match)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs text-zinc-400 leading-relaxed">{pred.reasoning}</span>
                        {(pred.goalsData || pred.h2hData || pred.scheduleData || pred.clvPotential) && (
                          <div className="mt-1 space-y-1.5 p-2.5 bg-zinc-900/50 rounded-md">
                            {pred.goalsData && <div className="text-[11px] text-zinc-300"><span className="font-semibold text-blue-400">xG & 进球:</span> <br className="sm:hidden" />{pred.goalsData}</div>}
                            {pred.h2hData && <div className="text-[11px] text-zinc-300"><span className="font-semibold text-purple-400">历史交锋:</span> <br className="sm:hidden" />{pred.h2hData}</div>}
                            {pred.scheduleData && <div className="text-[11px] text-zinc-300"><span className="font-semibold text-amber-400">赛程体能:</span> <br className="sm:hidden" />{pred.scheduleData}</div>}
                            {pred.clvPotential && <div className="text-[11px] text-zinc-300"><span className="font-semibold text-rose-400">亚盘 & EV:</span> <br className="sm:hidden" />{pred.clvPotential}</div>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-zinc-800 flex items-start gap-3 text-xs text-zinc-500">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <p>
            竞彩有风险，投注需谨慎。AI分析仅供参考，不构成绝对的投资建议。请合理控制仓位，切勿沉迷。
          </p>
        </div>
      </div>
    </motion.div>
  );
}
