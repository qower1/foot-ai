import React from 'react';
import { Match, Prediction } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface MatchDetailModalProps {
  match: Match | null;
  prediction?: Prediction;
  onClose: () => void;
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

export function MatchDetailModal({ match, prediction, onClose }: MatchDetailModalProps) {
  if (!match) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/50 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center">
              {match.matchNum && (
                <span className="text-xs font-mono text-zinc-500 mr-2">{match.matchNum}</span>
              )}
              <span className="px-2.5 py-1 rounded text-xs font-bold bg-zinc-800 text-zinc-300 mr-3">
                {match.league}
              </span>
              <span className="text-sm text-zinc-400 font-mono">
                {match.date} {match.time}
              </span>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-8 overflow-y-auto max-h-[calc(100dvh-5rem)]">
              <div className="flex flex-col sm:flex-row items-center justify-between mb-8 sm:mb-10 gap-6 sm:gap-0">
              <div className="text-center flex-1">
                <div className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">{match.homeTeam}</div>
                <div className="text-xs sm:text-sm text-zinc-500">主队 · 排名 {match.homeRank}</div>
                <div className="flex justify-center gap-1 mt-3">
                  {match.homeForm.map((f, i) => (
                    <span key={i} className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold ${f === 'W' ? 'bg-emerald-500/20 text-emerald-400' : f === 'D' ? 'bg-zinc-700 text-zinc-300' : 'bg-rose-500/20 text-rose-400'}`}>
                      {f}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="px-6 text-zinc-600 font-bold text-xl">VS</div>
              
              <div className="text-center flex-1">
                <div className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">{match.awayTeam}</div>
                <div className="text-xs sm:text-sm text-zinc-500">客队 · 排名 {match.awayRank}</div>
                <div className="flex justify-center gap-1 mt-3">
                  {match.awayForm.map((f, i) => (
                    <span key={i} className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold ${f === 'W' ? 'bg-emerald-500/20 text-emerald-400' : f === 'D' ? 'bg-zinc-700 text-zinc-300' : 'bg-rose-500/20 text-rose-400'}`}>
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8">
              <div className="bg-zinc-800/30 rounded-xl p-5 border border-zinc-800">
                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">标准盘 (胜平负)</div>
                <div className="flex justify-between font-mono text-lg">
                  <div className="text-center">
                    <div className="text-emerald-400 font-bold">{match.odds.home.toFixed(2)}</div>
                    <div className="text-[10px] text-zinc-500 mt-1">主胜</div>
                  </div>
                  <div className="text-center">
                    <div className="text-zinc-300 font-bold">{match.odds.draw.toFixed(2)}</div>
                    <div className="text-[10px] text-zinc-500 mt-1">平局</div>
                  </div>
                  <div className="text-center">
                    <div className="text-rose-400 font-bold">{match.odds.away.toFixed(2)}</div>
                    <div className="text-[10px] text-zinc-500 mt-1">客胜</div>
                  </div>
                </div>
              </div>

              {match.letOdds && (
                <div className="bg-zinc-800/30 rounded-xl p-5 border border-zinc-800">
                  <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">让球盘</div>
                  <div className="flex justify-between font-mono text-lg">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${match.letOdds.letCount > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                          {match.letOdds.letCount > 0 ? `+${match.letOdds.letCount}` : match.letOdds.letCount}
                        </span>
                        <div className="bg-emerald-400 font-bold text-zinc-900 px-1 rounded">{match.letOdds.home.toFixed(2)}</div>
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-1">让胜</div>
                    </div>
                    <div className="text-center">
                      <div className="text-zinc-300 font-bold">{match.letOdds.draw.toFixed(2)}</div>
                      <div className="text-[10px] text-zinc-500 mt-1">让平</div>
                    </div>
                    <div className="text-center">
                      <div className="text-rose-400 font-bold">{match.letOdds.away.toFixed(2)}</div>
                      <div className="text-[10px] text-zinc-500 mt-1">让负</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {prediction && (
              <div className="space-y-4">
                <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-bold text-emerald-400">AI 深度分析</div>
                    <div className="text-xs font-mono text-emerald-500">信心指数: {prediction.confidence}%</div>
                  </div>
                  <div className="text-sm text-zinc-300 leading-relaxed">
                    {prediction.reasoning}
                  </div>
                  <div className="mt-4 pt-4 border-t border-emerald-500/20 flex justify-between items-center">
                    <span className="text-xs text-zinc-400">推荐选项</span>
                    <span className="px-3 py-1 bg-emerald-500 text-zinc-950 font-bold rounded text-sm">
                      {getRecommendationLabel(prediction.recommendation)}
                    </span>
                  </div>
                </div>

                {(prediction.goalsData || prediction.h2hData) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {prediction.goalsData && (
                      <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
                        <div className="text-xs font-bold text-blue-400 mb-2">xG / 进球数据</div>
                        <div className="text-sm text-zinc-300 leading-relaxed">
                          {prediction.goalsData}
                        </div>
                      </div>
                    )}
                    {prediction.h2hData && (
                      <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4">
                        <div className="text-xs font-bold text-purple-400 mb-2">历史交锋 (H2H)</div>
                        <div className="text-sm text-zinc-300 leading-relaxed">
                          {prediction.h2hData}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {prediction.scheduleData && (
                  <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4 mt-4">
                    <div className="text-xs font-bold text-amber-400 mb-2">赛程与体能分析</div>
                    <div className="text-sm text-zinc-300 leading-relaxed">
                      {prediction.scheduleData}
                    </div>
                  </div>
                )}

                {prediction.clvPotential && (
                  <div className="bg-rose-900/20 border border-rose-500/30 rounded-xl p-4 mt-4">
                    <div className="text-xs font-bold text-rose-400 mb-2">CLV 预判 & 亚盘价值</div>
                    <div className="text-sm text-zinc-300 leading-relaxed">
                      {prediction.clvPotential}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {!prediction && (
              <div className="text-center py-6 text-sm text-zinc-500">
                点击右上角 "启动 AI 分析" 获取该场比赛的深度预测。
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
