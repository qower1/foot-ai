import React, { useState, useRef } from 'react';
import { Match, Prediction, BettingStrategy, HistoryRecord, AnalysisRecord } from '../types';
import { BrainCircuit, List, Share2, X, Download, Loader2, ShieldAlert, Target, TrendingUp, Copy, Check, FileText } from 'lucide-react';
import { toPng } from 'html-to-image';

interface TodayAnalysisViewProps {
  analysisHistory: AnalysisRecord[];
  historyRecords: HistoryRecord[];
  initialBankroll: number;
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

const getCompliantLabel = (rec: string) => {
  const labels: Record<string, string> = {
    home: '主队方向',
    draw: '握手言和',
    away: '客队方向',
    letHome: '让球主队',
    letDraw: '让球平局',
    letAway: '让球客队',
    over: '进球较多',
    under: '进球较少',
    pass: '数据观望'
  };
  return labels[rec] || rec.toUpperCase();
};

export function TodayAnalysisView({ analysisHistory, historyRecords, initialBankroll }: TodayAnalysisViewProps) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  const [selectedId, setSelectedId] = useState<string | null>(analysisHistory.length > 0 ? analysisHistory[0].id : null);
  const prevHistoryLengthRef = useRef(analysisHistory.length);

  React.useEffect(() => {
    if (analysisHistory.length > 0) {
      if (!analysisHistory.find(h => h.id === selectedId)) {
        setSelectedId(analysisHistory[0].id);
      } else if (analysisHistory.length > prevHistoryLengthRef.current) {
        // A new analysis was added, auto-select it
        setSelectedId(analysisHistory[0].id);
      }
    }
    prevHistoryLengthRef.current = analysisHistory.length;
  }, [analysisHistory, selectedId]);

  const analysisResult = analysisHistory.find(h => h.id === selectedId) || null;

  if (!analysisResult) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 h-full">
        <BrainCircuit className="w-16 h-16 mb-4 text-zinc-700" />
        <p className="text-lg font-medium text-zinc-400">暂无历史分析结果</p>
        <p className="text-sm mt-2">请在“今日赛事”中点击“启动 AI 分析”获取最新预测。</p>
      </div>
    );
  }

  const { predictions, matchesSnapshot: matches } = analysisResult;
  
  // Calculate historical accuracy for the share card
  const completed = historyRecords.filter(r => r.status !== 'pending');
  const won = completed.filter(r => r.status === 'won');
  const lost = completed.filter(r => r.status === 'lost');
  const wonCount = won.length;
  const lostCount = lost.length;
  const accuracy = completed.length > 0 ? ((wonCount / completed.length) * 100).toFixed(1) : '0.0';

  let totalProfit = 0;
  let totalStake = 0;
  let totalOddsWon = 0;
  let currentBankroll = initialBankroll;

  const sortedCompleted = [...completed].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  sortedCompleted.forEach((record) => {
    const stakeAmount = currentBankroll * record.strategy.suggestedStake;
    totalStake += stakeAmount;
    
    let profit = 0;
    if (record.status === 'won') {
      profit = stakeAmount * (record.strategy.totalOdds - 1);
      totalProfit += profit;
      totalOddsWon += record.strategy.totalOdds;
      currentBankroll += profit;
    } else if (record.status === 'lost') {
      profit = -stakeAmount;
      totalProfit += profit;
      currentBankroll += profit;
    }
  });

  const roiNum = initialBankroll > 0 ? (totalProfit / initialBankroll) * 100 : 0;
  const roi = roiNum.toFixed(1);
  const avgOdds = won.length > 0 ? (totalOddsWon / won.length).toFixed(2) : '-';

  // Filter recommended predictions
  const recommendedPredictions = predictions.filter(pred => 
    analysisResult.strategy.matches.includes(pred.matchId) && pred.recommendation !== 'pass'
  );

  const handleExportImage = async () => {
    if (!shareCardRef.current) return;
    try {
      setIsExporting(true);
      
      const scrollContainer = document.getElementById('share-scroll-container');
      const modalContent = document.getElementById('share-modal-content');
      
      let originalOverflow = '';
      let originalHeight = '';
      let originalMaxHeight = '';
      
      if (scrollContainer) {
        originalOverflow = scrollContainer.style.overflow;
        originalHeight = scrollContainer.style.height;
        scrollContainer.style.overflow = 'visible';
        scrollContainer.style.height = 'auto';
      }
      
      if (modalContent) {
        originalMaxHeight = modalContent.style.maxHeight;
        modalContent.style.maxHeight = 'none';
      }
      
      // Wait a tick for DOM to update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const dataUrl = await toPng(shareCardRef.current, {
        backgroundColor: '#09090b', // zinc-950
        pixelRatio: 2, // High resolution for social media
        width: shareCardRef.current.scrollWidth,
        height: shareCardRef.current.scrollHeight,
        style: {
          margin: '0',
          transform: 'none'
        }
      });
      
      if (scrollContainer) {
        scrollContainer.style.overflow = originalOverflow;
        scrollContainer.style.height = originalHeight;
      }
      
      if (modalContent) {
        modalContent.style.maxHeight = originalMaxHeight;
      }
      
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `AI赛事推演_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.png`;
      link.click();
    } catch (error) {
      console.error('Failed to export image:', error);
      alert('导出图片失败，请重试。');
    } finally {
      setIsExporting(false);
    }
  };

  const analysisDateStr = analysisResult.timestamp ? new Date(analysisResult.timestamp).toLocaleDateString('zh-CN') : new Date().toLocaleDateString('zh-CN');

  const articleText = analysisResult.articleIntro
    ? `【AI体育数据模型 - 每日推演】\n今天是 ${analysisDateStr}，AI引擎对今日的 ${predictions.length} 场核心赛事进行了深度推演。结合多维度数据交叉比对，最终精选出 ${recommendedPredictions.length} 场核心数据方向。\n\n${analysisResult.strategy.reasoning}\n\n${analysisResult.articleIntro}\n\n截至目前，本模型累计完成 ${completed.length} 场赛事推演，综合准确度稳定在 ${accuracy}%，平均期望指数 ${avgOdds}，模型整体表现指数达到 ${roiNum > 0 ? '+' : ''}${roi}。\n\n（注：本内容仅为AI技术测试与体育数据模型交流，纯属计算机算法研究，不构成任何建议，请理性参考。）`
    : `【AI体育数据模型 - 每日推演】\n今天是 ${analysisDateStr}，AI引擎对今日的 ${predictions.length} 场核心赛事进行了深度推演。结合多维度数据交叉比对，最终精选出 ${recommendedPredictions.length} 场核心数据方向。\n\n${analysisResult.strategy.reasoning}\n\n截至目前，本模型累计完成 ${completed.length} 场赛事推演，综合准确度稳定在 ${accuracy}%，平均期望指数 ${avgOdds}，模型整体表现指数达到 ${roiNum > 0 ? '+' : ''}${roi}。\n\n（注：本内容仅为AI技术测试与体育数据模型交流，纯属计算机算法研究，不构成任何建议，请理性参考。）`;

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(articleText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
      alert('复制失败，请手动复制。');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 relative">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <BrainCircuit className="w-6 h-6 text-emerald-400" />
              历史分析记录
            </h2>
            <p className="text-zinc-400 mt-1">AI对赛事的深度解读与预测历史</p>
          </div>
          <div className="flex items-center gap-4">
            <select
              className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block px-3 py-2 outline-none cursor-pointer"
              value={selectedId || ''}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {analysisHistory.map((history) => (
                <option key={history.id} value={history.id}>
                  {new Date(history.timestamp).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })} ({history.predictions.length}场)
                </option>
              ))}
            </select>
            <button 
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-medium rounded-lg transition-colors border border-emerald-500/20"
            >
              <Share2 className="w-4 h-4" />
              生成小红书分享图
            </button>
          </div>
        </div>

        {/* Article Intro Block */}
        <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/50 rounded-xl p-6 relative group">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              今日分析描述（可直接复制发文）
            </h3>
            <button
              onClick={handleCopyText}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-md transition-colors border border-zinc-700"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">已复制</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>一键复制</span>
                </>
              )}
            </button>
          </div>
          <div className="bg-zinc-950/50 rounded-lg p-4 border border-zinc-800/50">
            <p className="text-sm text-zinc-400 whitespace-pre-wrap leading-relaxed font-mono">
              {articleText}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {predictions.map(pred => {
            const match = matches.find(m => m.id === pred.matchId);
            if (!match) return null;

            return (
              <div key={pred.matchId} className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/50 rounded-xl p-6 hover:border-zinc-700/50 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {match.matchNum && <span className="text-xs font-mono text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">{match.matchNum}</span>}
                      <span className="text-xs font-bold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">{match.league}</span>
                      <span className="text-xs text-zinc-500 font-mono">{match.time}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mt-2">
                      <span>{match.homeTeam}</span>
                      <span className="text-zinc-600 text-sm">vs</span>
                      <span>{match.awayTeam}</span>
                    </h3>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-sm font-bold px-3 py-1 rounded-lg border ${
                      pred.recommendation === 'pass' 
                        ? 'bg-zinc-800/50 text-zinc-400 border-zinc-700' 
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {getRecommendationLabel(pred.recommendation)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-zinc-800/30 rounded-lg border border-zinc-800">
                  <div>
                    <span className="block text-xs text-zinc-500 mb-1">AI 信心指数</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white">{pred.confidence}%</span>
                      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${pred.confidence >= 80 ? 'bg-emerald-400' : pred.confidence >= 60 ? 'bg-amber-400' : 'bg-rose-400'}`}
                          style={{ width: `${pred.confidence}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <span className="block text-xs text-zinc-500 mb-1">预期价值 (EV)</span>
                    <span className={`font-mono font-bold ${pred.expectedValue > 1 ? 'text-emerald-400' : 'text-zinc-400'}`}>
                      {pred.expectedValue > 1 ? pred.expectedValue.toFixed(2) : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-zinc-500 mb-1">建议仓位</span>
                    <span className="font-mono font-bold text-rose-400">
                      {pred.recommendation !== 'pass' ? `${(analysisResult.strategy.suggestedStake * 100).toFixed(1)}%` : '-'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                    <List className="w-3.5 h-3.5" />
                    分析逻辑
                  </h4>
                  <p className="text-sm text-zinc-300 leading-relaxed bg-zinc-800/50 p-3 rounded-lg border border-zinc-700/50">
                    {pred.reasoning}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto items-start">
          <div id="share-modal-content" className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] max-w-[800px] w-full mt-10 mb-10">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Share2 className="w-5 h-5 text-emerald-400" />
                生成小红书分享图
              </h3>
              <button 
                onClick={() => setShowShareModal(false)}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div id="share-scroll-container" className="flex-1 overflow-y-auto p-6 bg-zinc-950 custom-scrollbar">
              {/* The Actual Share Card for html-to-image */}
              <div 
                ref={shareCardRef} 
                className="w-[750px] mx-auto bg-zinc-950 text-zinc-200 relative overflow-hidden p-10 font-sans"
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
              >
                {/* Background Glows */}
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-[100px]" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500/20 rounded-full blur-[100px]" />
                
                {/* Top Border Accent */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-400 to-cyan-400" />

                {/* Header */}
                <div className="flex justify-between items-end mb-12 relative z-10">
                  <div>
                    <div className="flex items-center gap-4 mb-3">
                      <h1 className="text-[42px] font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 tracking-tight leading-tight">
                        AI 体育数据模型
                      </h1>
                      <span className="px-4 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-full text-lg font-bold border border-emerald-500/30">
                        {analysisResult.strategy.type === 'single' ? '单关价值投' : '高赔率串关'}
                        {analysisResult.strategy.type === 'accumulator' && ` (综合指数: ${analysisResult.strategy.totalOdds.toFixed(2)})`}
                      </span>
                    </div>
                    <p className="text-[22px] text-zinc-400 font-medium tracking-wide">每日核心赛事推演 · 纯技术分享</p>
                  </div>
                  <div className="text-right">
                    <div className="text-[36px] font-black text-white mb-1 tracking-tighter">
                      {analysisResult.timestamp ? new Date(analysisResult.timestamp).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }).replace('/', '.') : new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }).replace('/', '.')}
                    </div>
                    <div className="text-lg text-zinc-500 font-mono tracking-widest uppercase">v2.0 Engine</div>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-4 gap-3 mb-12 relative z-10">
                  <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4 backdrop-blur-md shadow-xl flex flex-col justify-center">
                    <div className="text-zinc-400 text-xs mb-1.5 font-medium flex items-center gap-1">
                      <BrainCircuit className="w-3.5 h-3.5" />
                      历史胜率
                    </div>
                    <div className="text-2xl font-black text-emerald-400 leading-none tracking-tighter">{accuracy}<span className="text-sm ml-0.5">%</span></div>
                  </div>
                  <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4 backdrop-blur-md shadow-xl flex flex-col justify-center">
                    <div className="text-zinc-400 text-xs mb-1.5 font-medium flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      历史收益率
                    </div>
                    <div className="text-2xl font-black text-rose-400 leading-none tracking-tighter">{roiNum > 0 ? '+' : ''}{roi}<span className="text-sm ml-0.5">%</span></div>
                  </div>
                  <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4 backdrop-blur-md shadow-xl flex flex-col justify-center">
                    <div className="text-zinc-400 text-xs mb-1.5 font-medium flex items-center gap-1">
                      <Target className="w-3.5 h-3.5" />
                      历史红黑
                    </div>
                    <div className="text-2xl font-black text-white leading-none tracking-tighter">
                      <span className="text-rose-400">{wonCount}红</span>
                      <span className="text-zinc-500 text-sm mx-0.5">/</span>
                      <span className="text-zinc-400">{lostCount}黑</span>
                    </div>
                  </div>
                  <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4 backdrop-blur-md shadow-xl flex flex-col justify-center">
                    <div className="text-zinc-400 text-xs mb-1.5 font-medium flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      平均命中赔率
                    </div>
                    <div className="text-2xl font-black text-amber-400 leading-none tracking-tighter">{avgOdds}</div>
                  </div>
                </div>

                {/* Matches List */}
                <div className="space-y-6 relative z-10">
                  {recommendedPredictions.map((pred, idx) => {
                    const match = matches.find(m => m.id === pred.matchId);
                    if (!match) return null;
                    
                    let matchOdds = '-';
                    if (match.odds) {
                      if (pred.recommendation === 'home') matchOdds = match.odds.home.toString();
                      else if (pred.recommendation === 'draw') matchOdds = match.odds.draw.toString();
                      else if (pred.recommendation === 'away') matchOdds = match.odds.away.toString();
                    }

                    return (
                      <div key={pred.matchId} className="bg-zinc-900/60 border border-zinc-800/60 rounded-[24px] p-8 backdrop-blur-sm relative overflow-hidden">
                        {/* Status indicator line */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${pred.recommendation === 'pass' ? 'bg-zinc-600' : 'bg-emerald-500'}`} />
                        
                        <div className="flex items-center gap-3 mb-4">
                          {match.matchNum && (
                            <span className="text-sm font-bold text-zinc-400 bg-zinc-800/50 px-3 py-1 rounded-full border border-zinc-700/50">
                              {match.matchNum}
                            </span>
                          )}
                          <span className="text-sm font-bold text-zinc-300 bg-zinc-800 px-3 py-1 rounded-full">{match.league}</span>
                          <span className="text-sm text-zinc-500 font-mono">{match.time}</span>
                        </div>
                        
                        <div className="flex justify-between items-center mb-6">
                          <h3 className="text-3xl font-bold text-white flex items-center gap-4">
                            <span>{match.homeTeam}</span>
                            <span className="text-zinc-600 text-xl font-normal">vs</span>
                            <span>{match.awayTeam}</span>
                          </h3>
                        </div>

                        <div className="flex items-center gap-4 mb-5">
                          <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-5 py-3 flex items-center gap-3">
                            <span className="text-zinc-500 text-lg">模型倾向</span>
                            <span className={`text-xl font-bold ${pred.recommendation === 'pass' ? 'text-zinc-300' : 'text-emerald-400'}`}>
                              {getCompliantLabel(pred.recommendation)}
                              {matchOdds !== '-' && pred.recommendation !== 'pass' && (
                                <span className="ml-2 text-sm text-emerald-500/80 font-mono">@{matchOdds}</span>
                              )}
                            </span>
                          </div>
                          <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-5 py-3 flex items-center gap-3">
                            <span className="text-zinc-500 text-lg">置信度</span>
                            <span className="text-xl font-bold text-white font-mono">{pred.confidence}%</span>
                          </div>
                          <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-5 py-3 flex items-center gap-3">
                            <span className="text-zinc-500 text-lg">建议仓位</span>
                            <span className="text-xl font-bold text-rose-400 font-mono">{(analysisResult.strategy.suggestedStake * 100).toFixed(1)}%</span>
                          </div>
                        </div>

                        <div className="bg-zinc-950/50 rounded-xl p-5 border border-zinc-800/50">
                          <p className="text-zinc-300 text-lg leading-relaxed">
                            <span className="text-emerald-400/80 font-bold mr-2">核心逻辑:</span>
                            {pred.reasoning.length > 120 ? pred.reasoning.substring(0, 120) + '...' : pred.reasoning}
                          </p>
                        </div>

                        {pred.scheduleData && (
                          <div className="mt-4 bg-zinc-950/30 rounded-xl p-4 border border-zinc-800/30">
                            <div className="text-xs text-zinc-500 mb-1">赛程与体能分析</div>
                            <div className="text-sm text-amber-400/90 leading-relaxed">{pred.scheduleData}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Footer Disclaimer */}
                <div className="mt-16 pt-8 border-t border-zinc-800/80 relative z-10 flex items-start gap-4">
                  <ShieldAlert className="w-8 h-8 text-zinc-600 shrink-0" />
                  <p className="text-zinc-500 text-base leading-relaxed">
                    <strong className="text-zinc-400 block mb-1">合规声明与风险提示</strong>
                    本内容仅为 AI 数据模型技术测试与代码交流展示，所有数据均由算法生成，不构成任何形式的引导、建议或承诺。请严格遵守国家法律法规，坚决抵制任何非法行为，理性欣赏体育竞技。
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3">
              <button 
                onClick={() => setShowShareModal(false)}
                className="px-6 py-2.5 rounded-lg font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleExportImage}
                disabled={isExporting}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                {isExporting ? '生成中...' : '保存图片'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
