import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { MatchList } from './components/MatchList';
import { AIAnalysisPanel } from './components/AIAnalysisPanel';
import { MatchDetailModal } from './components/MatchDetailModal';
import { DataModelView } from './components/DataModelView';
import { HistoryView } from './components/HistoryView';
import { RiskManagementView } from './components/RiskManagementView';
import { TodayAnalysisView } from './components/TodayAnalysisView';
import { ConfirmModal } from './components/ConfirmModal';
import { mockMatches } from './data/mockMatches';
import { analyzeMatches, fetchLiveMatches } from './services/geminiService';
import { Prediction, BettingStrategy, Match, HistoryRecord } from './types';
import { BrainCircuit, Loader2, TrendingUp, Wallet, RefreshCw } from 'lucide-react';
import { AnimatePresence } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useState('today');
  const [matches, setMatches] = useState<Match[]>(mockMatches);
  const [isFetching, setIsFetching] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ predictions: Prediction[], strategy: BettingStrategy, articleIntro?: string } | null>(() => {
    const saved = localStorage.getItem('analysis_result');
    return saved ? JSON.parse(saved) : null;
  });
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>(() => {
    const saved = localStorage.getItem('betting_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; message: string; onConfirm: () => void }>({
    isOpen: false,
    message: '',
    onConfirm: () => {}
  });

  const [initialBankroll, setInitialBankroll] = useState<number>(() => {
    const saved = localStorage.getItem('initial_bankroll');
    return saved ? JSON.parse(saved) : 10000;
  });

  // Global Model Parameters
  const [modelParams, setModelParams] = useState(() => {
    const saved = localStorage.getItem('model_params');
    return saved ? JSON.parse(saved) : {
      evThreshold: 1.05,
      kellyFraction: 0.25,
      confidenceMin: 70
    };
  });

  const [modelProvider, setModelProvider] = useState<'gemini' | 'deepseek'>(() => {
    const saved = localStorage.getItem('model_provider');
    return (saved as 'gemini' | 'deepseek') || 'gemini';
  });

  useEffect(() => {
    localStorage.setItem('model_provider', modelProvider);
  }, [modelProvider]);

  useEffect(() => {
    localStorage.setItem('betting_history', JSON.stringify(historyRecords));
  }, [historyRecords]);

  useEffect(() => {
    localStorage.setItem('initial_bankroll', JSON.stringify(initialBankroll));
  }, [initialBankroll]);

  useEffect(() => {
    localStorage.setItem('model_params', JSON.stringify(modelParams));
  }, [modelParams]);

  useEffect(() => {
    if (analysisResult) {
      localStorage.setItem('analysis_result', JSON.stringify(analysisResult));
    } else {
      localStorage.removeItem('analysis_result');
    }
  }, [analysisResult]);

  const handleFetchLiveMatches = async () => {
    setIsFetching(true);
    try {
      const liveMatches = await fetchLiveMatches();
      if (liveMatches && liveMatches.length > 0) {
        setMatches(liveMatches);
        setAnalysisResult(null); // Clear previous analysis
      } else {
        alert('获取到的赛事数据为空。');
      }
    } catch (error: any) {
      console.error('Failed to fetch live matches:', error);
      alert(`获取实时赛事失败: ${error.message || '未知错误'}`);
    } finally {
      setIsFetching(false);
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeMatches(matches, modelParams, modelProvider);
      setAnalysisResult(result);
    } catch (error) {
      console.error('Failed to analyze matches:', error);
      alert('AI分析失败，请检查网络或API Key设置。');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveHistory = () => {
    if (!analysisResult) return;
    
    const newRecord: HistoryRecord = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      strategy: analysisResult.strategy,
      predictions: analysisResult.predictions,
      matches: matches.filter(m => analysisResult.strategy.matches.includes(m.id) || analysisResult.predictions.some(p => p.matchId === m.id)),
      status: 'pending'
    };
    
    setHistoryRecords(prev => [newRecord, ...prev]);
  };

  const handleDeleteRecord = (id: string) => {
    setConfirmState({
      isOpen: true,
      message: '确定要删除这条实战记录吗？',
      onConfirm: () => {
        setHistoryRecords(prev => prev.filter(r => r.id !== id));
      }
    });
  };

  const handleClearAllRecords = () => {
    setConfirmState({
      isOpen: true,
      message: '确定要清空所有实战记录吗？此操作不可恢复。',
      onConfirm: () => {
        setHistoryRecords([]);
      }
    });
  };

  const handleUpdateRecordStatus = (id: string, status: 'won' | 'lost' | 'pending') => {
    setHistoryRecords(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  return (
    <div 
      className="flex h-screen text-zinc-200 font-sans selection:bg-emerald-500/30 relative overflow-hidden"
      style={{
        backgroundImage: 'linear-gradient(to bottom right, rgba(9, 9, 11, 0.85), rgba(9, 9, 11, 0.95)), url("https://images.unsplash.com/photo-1518605368461-1e1e38ce8058?q=80&w=2000&auto=format&fit=crop")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {activeTab === 'today' && (
          <>
            <header className="h-20 border-b border-zinc-800/50 bg-zinc-900/40 backdrop-blur-md flex items-center justify-between px-8">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">今日赛事分析</h1>
                <p className="text-sm text-zinc-400 mt-1">{new Date().toLocaleDateString('zh-CN')} · 共 {matches.length} 场比赛</p>
              </div>
              
              <div className="flex items-center gap-4">
                <select 
                  className="bg-zinc-800 border-zinc-700 text-zinc-300 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block px-3 py-2 outline-none cursor-pointer"
                  value={modelProvider}
                  onChange={(e) => setModelProvider(e.target.value as 'gemini' | 'deepseek')}
                >
                  <option value="gemini">Gemini 3.1 Pro</option>
                  <option value="deepseek">DeepSeek Chat</option>
                </select>
                <div className="w-px h-8 bg-zinc-800 mx-1"></div>
                <button
                  onClick={handleFetchLiveMatches}
                  disabled={isFetching || isAnalyzing}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-700"
                >
                  <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                  {isFetching ? '获取中...' : '获取最新赛事'}
                </button>
                <div className="w-px h-8 bg-zinc-800 mx-2"></div>
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || isFetching || matches.length === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]"
                >
                  {isAnalyzing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <BrainCircuit className="w-5 h-5" />
                  )}
                  {isAnalyzing ? 'AI 深度运算中...' : '启动 AI 分析'}
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-5xl mx-auto">
                <MatchList 
                  matches={matches} 
                  predictions={analysisResult?.predictions}
                  onSelectMatch={setSelectedMatch} 
                />
              </div>
            </div>

            <AnimatePresence>
              {analysisResult && (
                <AIAnalysisPanel 
                  predictions={analysisResult.predictions} 
                  strategy={analysisResult.strategy} 
                  matches={matches}
                  onClose={() => setAnalysisResult(null)} 
                  onSaveHistory={handleSaveHistory}
                />
              )}
            </AnimatePresence>
            
            {selectedMatch && (
              <MatchDetailModal
                match={selectedMatch}
                prediction={analysisResult?.predictions.find(p => p.matchId === selectedMatch.id)}
                onClose={() => setSelectedMatch(null)}
              />
            )}
          </>
        )}

        {activeTab === 'model' && <DataModelView params={modelParams} onParamsChange={setModelParams} />}
        
        {activeTab === 'analysis' && <TodayAnalysisView matches={matches} analysisResult={analysisResult} historyRecords={historyRecords} initialBankroll={initialBankroll} />}
        
        {activeTab === 'history' && (
          <HistoryView 
            records={historyRecords} 
            initialBankroll={initialBankroll}
            onDeleteRecord={handleDeleteRecord}
            onUpdateStatus={handleUpdateRecordStatus}
            onClearAllRecords={handleClearAllRecords}
          />
        )}
        
        {activeTab === 'risk' && (
          <RiskManagementView 
            records={historyRecords} 
            initialBankroll={initialBankroll}
            onBankrollChange={setInitialBankroll}
          />
        )}
      </main>

      <ConfirmModal 
        isOpen={confirmState.isOpen} 
        message={confirmState.message} 
        onConfirm={confirmState.onConfirm} 
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))} 
      />
    </div>
  );
}

