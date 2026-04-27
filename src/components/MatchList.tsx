import React from 'react';
import { Match, Prediction } from '../types';

interface MatchListProps {
  matches: Match[];
  predictions?: Prediction[];
  onSelectMatch: (match: Match) => void;
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

export function MatchList({ matches, predictions, onSelectMatch }: MatchListProps) {
  return (
    <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/50 rounded-xl overflow-hidden shadow-2xl">
      <div className="grid grid-cols-12 gap-4 p-4 border-b border-zinc-800/50 bg-zinc-900/40 text-xs font-medium text-zinc-400 uppercase tracking-wider">
        <div className="col-span-1">赛事</div>
        <div className="col-span-2">时间</div>
        <div className="col-span-4 text-center">对阵 (主 vs 客)</div>
        <div className="col-span-3 text-center">胜平负赔率</div>
        <div className="col-span-2 text-right">状态/预测</div>
      </div>
      
      <div className="divide-y divide-zinc-800">
        {matches.map((match) => {
          const prediction = predictions?.find(p => p.matchId === match.id);
          
          return (
            <div 
              key={match.id}
              onClick={() => onSelectMatch(match)}
              className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-zinc-800/50 cursor-pointer transition-colors group"
            >
              <div className="col-span-1 flex flex-col gap-1">
                {match.matchNum && <span className="text-xs font-mono text-zinc-500">{match.matchNum}</span>}
                <span className="px-2 py-1 rounded text-xs font-bold bg-zinc-800 text-zinc-300 w-fit">
                  {match.league}
                </span>
              </div>
              <div className="col-span-2 text-sm text-zinc-400 font-mono">
                {match.date.slice(5)} {match.time}
              </div>
              <div className="col-span-4 flex items-center justify-center gap-4">
                <span className="text-right flex-1 font-medium text-zinc-200 group-hover:text-emerald-400 transition-colors">{match.homeTeam}</span>
                <span className="text-zinc-600 font-bold text-xs">VS</span>
                <span className="text-left flex-1 font-medium text-zinc-200 group-hover:text-emerald-400 transition-colors">{match.awayTeam}</span>
              </div>
              <div className="col-span-3 flex justify-center gap-2 font-mono text-sm">
                <span className={`px-3 py-1.5 rounded font-semibold ${prediction?.recommendation === 'home' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-400'}`}>
                  {match.odds.home.toFixed(2)}
                </span>
                <span className={`px-3 py-1.5 rounded font-semibold ${prediction?.recommendation === 'draw' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-400'}`}>
                  {match.odds.draw.toFixed(2)}
                </span>
                <span className={`px-3 py-1.5 rounded font-semibold ${prediction?.recommendation === 'away' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-400'}`}>
                  {match.odds.away.toFixed(2)}
                </span>
              </div>
              <div className="col-span-2 text-right">
                {prediction && prediction.recommendation !== 'pass' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                    AI 推荐: {getRecommendationLabel(prediction.recommendation)}
                  </span>
                ) : prediction && prediction.recommendation === 'pass' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-800 text-zinc-500">
                    放弃
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400">
                    未分析
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
