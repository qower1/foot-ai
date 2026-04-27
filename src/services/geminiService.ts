import { GoogleGenAI, Type } from '@google/genai';
import { Match, Prediction, BettingStrategy } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function fetchLiveMatches(): Promise<Match[]> {
  try {
    // Fetch the parsed JSON from our backend
    const response = await fetch('/api/matches/html');
    if (!response.ok) {
      throw new Error(`Failed to fetch matches: ${response.status}`);
    }
    const matches = await response.json();
    
    // Map the backend data to our Match interface
    return matches.map((m: any) => {
      let datePart = new Date().toISOString().split('T')[0];
      let timePart = '00:00';
      
      if (m.time) {
        const parts = m.time.trim().split(/\s+/);
        if (parts.length === 1) {
          // If it's just "19:35"
          if (parts[0].includes(':')) {
            timePart = parts[0];
          } else {
            datePart = parts[0];
          }
        } else if (parts.length >= 2) {
          // If it's "04-06 19:35" or "2026-04-06 19:35"
          const p1 = parts[0];
          const p2 = parts[parts.length - 1];
          
          if (p2.includes(':')) {
            timePart = p2;
            datePart = p1;
          } else {
            datePart = p1;
          }
        }
      }
      
      // Ensure datePart has year if it's just MM-DD
      if (datePart && datePart.length === 5 && datePart.includes('-')) {
        datePart = `${new Date().getFullYear()}-${datePart}`;
      }

      return {
        id: m.id,
        matchNum: m.matchNum,
        league: m.league,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        date: datePart,
        time: timePart,
        status: 'upcoming',
        odds: {
          home: m.odds.home,
          draw: m.odds.draw,
          away: m.odds.away
        },
        letOdds: {
          letCount: m.letOdds.letCount,
          home: m.letOdds.home,
          draw: m.letOdds.draw,
          away: m.letOdds.away
        },
        totalGoalsOdds: m.totalGoalsOdds,
        halfFullOdds: m.halfFullOdds,
        scoreOdds: m.scoreOdds,
        homeRank: 0,
        awayRank: 0,
        homeForm: [],
        awayForm: []
      };
    });
  } catch (error) {
    console.error('Error fetching live matches:', error);
    throw error;
  }
}

export async function analyzeMatches(
  matches: Match[], 
  modelParams?: { evThreshold: number; kellyFraction: number; confidenceMin: number },
  modelProvider: 'gemini' | 'deepseek' = 'gemini'
): Promise<{ predictions: Prediction[], strategy: BettingStrategy, articleIntro: string }> {
  
  // 1. TypeScript 算数学：计算市场公平概率 (Vig Removal)
  const matchesWithFairProb = matches.map(match => {
    if (!match.odds || !match.odds.home || !match.odds.draw || !match.odds.away) {
      return { ...match, fairProbabilities: { home: 0.33, draw: 0.33, away: 0.34 } };
    }
    const impliedHome = 1 / match.odds.home;
    const impliedDraw = 1 / match.odds.draw;
    const impliedAway = 1 / match.odds.away;
    const margin = impliedHome + impliedDraw + impliedAway;
    
    return {
      ...match,
      fairProbabilities: {
        home: Number((impliedHome / margin).toFixed(4)),
        draw: Number((impliedDraw / margin).toFixed(4)),
        away: Number((impliedAway / margin).toFixed(4))
      }
    };
  });

  const prompt = `
你是一位严谨的足球基本面分析师。
我们已经通过 TypeScript 代码计算出了每场比赛的“市场公平概率（Vig-free Probabilities）”。
你的任务是：基于这些公平概率，${modelProvider === 'gemini' ? '使用 Google 搜索' : '结合你庞大的知识库来推演'}球队的最新基本面信息，并输出“调整后的真实概率（Adjusted True Probabilities）”。

【核心任务：补充多维度基本面数据】
请分析以下每场比赛的最新深度数据：
1. 双方本赛季的 xG (期望进球) 和 xGA (期望失球) 数据。如果找不到准确的 xG，请根据两队的进攻和防守风格进行合理推演。
2. 双方历史交锋记录（H2H）
3. 双方核心球员伤停情况（Injuries & Suspensions）- 极度重要！
4. 双方近期赛程密集度与体能状况（Schedule & Fatigue）
5. 双方战意与积分榜形势（Motivation & Table Position）

【逻辑推理与概率微调】
1. 比较基本面与市场预期：如果你发现主队有核心前锋伤停，或者刚踢完欧冠体能极差，你应该将主队的“真实概率”调低（低于市场公平概率）。
2. xG 修正：使用搜索到的 xG/xGA 数据替代实际进球数，作为评估球队真实创造机会和防守能力的核心依据。如果某队实际进球远高于 xG，说明存在运气成分，应适当回调其真实概率。
3. Dixon-Coles 修正（低比分平局修正）：基础泊松分布通常会低估 0-0 和 1-1 的发生概率。在评估两支防守稳健或进攻乏力的球队时，必须手动上调平局（Draw）的真实概率，并相应下调胜负概率。
4. 亚盘优先原则 (Asian Handicap Focus)：标准盘(1X2)抽水通常在5%-8%，而亚盘抽水仅2%-3%。在计算出真实概率后，请务必评估亚盘(letOdds)的价值。如果亚盘存在价值，必须优先推荐亚盘 (letHome/letAway)，以大幅减少长期摩擦成本。
5. CLV (Closing Line Value) 预判：分析当前赔率是否具有跑赢临场关盘的潜力。结合基本面（如某队主力即将宣布伤停，或公众资金倾向），预判赔率走势。
6. 调整后的概率必须满足：home + draw + away = 1.0。
7. 给出你的信心指数（0-100）。如果基本面信息极度混乱或缺乏数据，请降低信心指数。
8. 撰写深度推理逻辑（reasoning），解释你为什么这样调整概率，必须提及 xG 数据、Dixon-Coles 修正、亚盘价值以及 CLV 预判的具体应用。
9. 无论 EV 是否达到阈值，请务必为每场比赛选出**最有可能打出且最具价值**的选项（recommendation），不要使用 'pass'。我们将由底层的 TypeScript 引擎来决定最终的精选组合。

赛事数据与市场公平概率：
${JSON.stringify(matchesWithFairProb, null, 2)}

请返回一个严格的JSON格式，包含每场比赛的分析（matchAnalyses）和今日的整体分析描述（articleIntro）。
要求：
- articleIntro 必须包含具体的赛程与体能分析。
- 语气专业、客观、充满科技感。
- 绝对不能包含“赌博”、“包赢”、“下注”、“买球”、“赔率”、“盘口”、“红单”、“黑单”、“盈利”、“赚钱”、“博彩”、“投资”、“回报”等敏感词汇。请使用“数据模型”、“核心方向”、“推演”、“预期价值”、“数据反馈”、“量化指标”、“基本面”等词汇。
`;

  try {
    let text = '';

    if (modelProvider === 'deepseek') {
      const apiKey = process.env.DEEPSEEK_API_KEY;
      if (!apiKey) throw new Error('DeepSeek API Key is missing. Please add it to your secrets.');
      const dsRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are a professional football data analyst. Please output your analysis ONLY in valid JSON format. Make sure to follow the JSON schema implied by the prompt strictly.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2
        })
      });

      if (!dsRes.ok) {
        throw new Error(`DeepSeek API failed: ${dsRes.status}`);
      }

      const dsData = await dsRes.json();
      text = dsData.choices[0]?.message?.content || '';

    } else {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          temperature: 0.2,
          topK: 1,
          topP: 0.95,
          tools: [{ googleSearch: {} }],
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              matchAnalyses: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    matchId: { type: Type.STRING },
                    recommendation: { type: Type.STRING },
                    adjustedProbabilities: {
                      type: Type.OBJECT,
                      properties: {
                        home: { type: Type.NUMBER },
                        draw: { type: Type.NUMBER },
                        away: { type: Type.NUMBER }
                      },
                      required: ['home', 'draw', 'away']
                    },
                    confidence: { type: Type.NUMBER },
                    reasoning: { type: Type.STRING },
                    expectedValue: { type: Type.NUMBER },
                    goalsData: { type: Type.STRING },
                    h2hData: { type: Type.STRING },
                    scheduleData: { type: Type.STRING },
                    clvPotential: { type: Type.STRING }
                  },
                  required: ['matchId', 'recommendation', 'adjustedProbabilities', 'confidence', 'reasoning', 'expectedValue', 'goalsData', 'h2hData', 'scheduleData', 'clvPotential']
                }
              },
              articleIntro: { type: Type.STRING }
            },
            required: ['matchAnalyses', 'articleIntro']
          }
        }
      });
      text = response.text || '';
    }

    if (!text) throw new Error('No response from AI');
    
    // Sometimes DeepSeek returns markdown wrapped JSON
    if (text.startsWith('\`\`\`json')) {
      text = text.replace(/^\`\`\`json\n/, '').replace(/\n\`\`\`$/, '');
    }
    
    const aiResult = JSON.parse(text);
    
    // 2. TypeScript 算数学：计算 EV 和 Kelly
    const predictions: Prediction[] = [];
    const evThreshold = modelParams?.evThreshold || 1.05;
    const confMin = modelParams?.confidenceMin || 70;
    const kellyFractionParam = modelParams?.kellyFraction || 0.25;

    for (const analysis of aiResult.matchAnalyses) {
      const match = matches.find(m => m.id === analysis.matchId);
      if (!match) continue;
      
      let finalEV = analysis.expectedValue || 0;
      let finalRec = analysis.recommendation || 'pass';

      // Fix AI hallucination where Expected Value is confused with Expected Return (e.g. 1.05 instead of 0.05)
      if (finalEV >= 1 && finalEV < 5) {
        finalEV = finalEV - 1;
      }

      // Recalculate 1X2 EV if recommendation is 1X2 to ensure math accuracy
      if (['home', 'draw', 'away'].includes(finalRec) && match.odds) {
        const totalProb = analysis.adjustedProbabilities.home + analysis.adjustedProbabilities.draw + analysis.adjustedProbabilities.away;
        const p = analysis.adjustedProbabilities[finalRec as 'home'|'draw'|'away'] / totalProb;
        const odds = match.odds[finalRec as 'home'|'draw'|'away'];
        finalEV = (p * odds) - 1;
      }

      predictions.push({
        matchId: match.id,
        recommendation: finalRec === 'pass' ? 'home' : finalRec as any, // fallback if AI still outputs pass
        confidence: analysis.confidence,
        reasoning: analysis.reasoning,
        expectedValue: Number(finalEV.toFixed(4)),
        goalsData: analysis.goalsData,
        h2hData: analysis.h2hData,
        scheduleData: analysis.scheduleData,
        clvPotential: analysis.clvPotential
      });
    }

    // 3. 构建跟单策略：优先寻找 2串1 且 赔率 > 2.0，并且组合胜率最高
    const getOdds = (p: Prediction, m: Match) => {
      if (['home', 'draw', 'away'].includes(p.recommendation) && m.odds) {
        return m.odds[p.recommendation as 'home'|'draw'|'away'];
      }
      if (['letHome', 'letDraw', 'letAway'].includes(p.recommendation) && m.letOdds) {
        const key = p.recommendation.replace('let', '').toLowerCase() as 'home'|'draw'|'away';
        return m.letOdds[key];
      }
      return 1.85; // fallback average odds
    };

    const getProb = (ev: number, odds: number) => {
      const prob = (ev + 1) / odds;
      return Math.min(Math.max(prob, 0.01), 0.99); // Clamp to 1% - 99%
    };

    const enrichedPredictions = predictions.map(p => {
      const m = matches.find(m => m.id === p.matchId)!;
      const odds = getOdds(p, m);
      const prob = getProb(p.expectedValue, odds);
      return { p, m, odds, prob };
    });

    let bestPair: [typeof enrichedPredictions[0], typeof enrichedPredictions[0]] | null = null;
    let maxProbForValidOdds = -1;
    let maxProbOverall = -1;
    let bestOverallPair: [typeof enrichedPredictions[0], typeof enrichedPredictions[0]] | null = null;

    for (let i = 0; i < enrichedPredictions.length; i++) {
      for (let j = i + 1; j < enrichedPredictions.length; j++) {
        const ep1 = enrichedPredictions[i];
        const ep2 = enrichedPredictions[j];
        
        const totalOdds = ep1.odds * ep2.odds;
        const combinedProb = ep1.prob * ep2.prob;

        if (combinedProb > maxProbOverall) {
          maxProbOverall = combinedProb;
          bestOverallPair = [ep1, ep2];
        }

        if (totalOdds >= 2.0 && combinedProb > maxProbForValidOdds) {
          maxProbForValidOdds = combinedProb;
          bestPair = [ep1, ep2];
        }
      }
    }

    const finalPair = bestPair || bestOverallPair;
    let strategy: BettingStrategy;

    if (finalPair) {
      const [ep1, ep2] = finalPair;
      const totalOdds = ep1.odds * ep2.odds;
      const combinedProb = ep1.prob * ep2.prob;
      
      // Kelly Formula for staking
      const b = totalOdds - 1;
      const p = combinedProb;
      const q = 1 - p;
      let kelly = (b * p - q) / b;
      if (kelly < 0) kelly = 0.02; // 保底 2% 仓位供网友固定打卡跟单
      
      const suggestedStake = Math.max(0.02, Math.min(kelly * kellyFractionParam, 0.05)); // Max 5%
      const oddsMetText = totalOdds >= 2.0 ? `赔率已到翻倍提款标准(${totalOdds.toFixed(2)})` : `赔率接近翻倍(${totalOdds.toFixed(2)})`;
      
      const p1Name = `${ep1.m.homeTeam} vs ${ep1.m.awayTeam}`;
      const p2Name = `${ep2.m.homeTeam} vs ${ep2.m.awayTeam}`;
      
      let reasoningTxt = `【核心数据模型 - 优选2串】算法在今日所有赛事中进行了深度扫描，锁定了这组期望价值最高的组合。\n\n`;
      reasoningTxt += `组合理论胜率预估： ${(combinedProb*100).toFixed(1)}%，综合指数： ${totalOdds.toFixed(2)}，建议资金占比： ${(suggestedStake*100).toFixed(1)}%。\n\n`;
      reasoningTxt += `核心入选逻辑：\n`;
      reasoningTxt += `1. ${p1Name}: ${ep1.p.reasoning.substring(0, 100)}...\n`;
      reasoningTxt += `2. ${p2Name}: ${ep2.p.reasoning.substring(0, 100)}...`;

      strategy = {
        date: new Date().toISOString(),
        type: 'accumulator',
        matches: [ep1.p.matchId, ep2.p.matchId],
        totalOdds: Number(totalOdds.toFixed(2)),
        suggestedStake: Number(suggestedStake.toFixed(4)),
        expectedReturn: Number(((combinedProb * totalOdds) - 1).toFixed(4)),
        reasoning: reasoningTxt
      };

      // 调整 UI 列表显示顺序，把选中的两场排在最前面
      const topSet = new Set([ep1.p.matchId, ep2.p.matchId]);
      const otherPreds = predictions.filter(pred => !topSet.has(pred.matchId));
      predictions.length = 0;
      predictions.push(ep1.p, ep2.p, ...otherPreds.sort((a, b) => b.confidence - a.confidence));

    } else if (enrichedPredictions.length === 1) {
      // Single (单关) - Fallback
      const ep1 = enrichedPredictions[0];
      const odds1 = ep1.odds;
      const prob1 = ep1.prob;
      
      const b = odds1 - 1;
      const p = prob1;
      const q = 1 - p;
      let kelly = (b * p - q) / b;
      if (kelly < 0) kelly = 0.02;
      
      const suggestedStake = Math.max(0.02, Math.min(kelly * kellyFractionParam, 0.05));
      
      strategy = {
        date: new Date().toISOString(),
        type: 'single',
        matches: [ep1.p.matchId],
        totalOdds: Number(odds1.toFixed(2)),
        suggestedStake: Number(suggestedStake.toFixed(4)),
        expectedReturn: Number((ep1.p.expectedValue - 1).toFixed(4)),
        reasoning: `【精选单场】今日满足2串阈值的赛事较少，模型为您精选以下单场数据选项。真实胜率评估 ${(prob1*100).toFixed(1)}%，建议资金配置 ${(suggestedStake*100).toFixed(1)}%。单场核心逻辑请参考详细分析。`
      };
    } else {
      strategy = {
        date: new Date().toISOString(),
        type: 'single',
        matches: [],
        totalOdds: 0,
        suggestedStake: 0,
        expectedReturn: 0,
        reasoning: `【数据观望】今日所有赛事期望价值(EV)及基本面反馈尚未达到核心标准，建议空仓观望，保护本金。`
      };
    }

    return {
      predictions,
      strategy,
      articleIntro: aiResult.articleIntro
    };

  } catch (error) {
    console.error('Error analyzing matches:', error);
    throw error;
  }
}
