import { Match, Prediction, BettingStrategy } from '../types';

async function matchFixturesWithLLM(matches: Match[], footballFixtures: any[], modelProvider: 'gemini' | 'deepseek' = 'gemini'): Promise<Record<string, number>> {
  if (!footballFixtures || footballFixtures.length === 0) return {};
  
  const prompt = `
  You are an expert sports data matcher. Your job is to link Chinese football matches with English API-Football fixtures.
  
  Chinese Matches:
  ${JSON.stringify(matches.map(m => ({ id: m.id, home: m.homeTeam, away: m.awayTeam, time: m.time, league: m.league })))}
  
  English Fixtures for Today (from API-Football):
  ${JSON.stringify(footballFixtures.map(f => ({ id: f.id, home: f.home, away: f.away, league: f.league, time: f.time })))}
  
  Identify corresponding matches. Match as many as you confidently can based on team names, leagues, and kickoff times. 
  Return a strict JSON array of matched pairs.
  {"mappings": [ {"matchId": "string id from Chinese match", "fixtureId": 1234} ]}
  `;
  
  try {
    let text = '';
    
    if (modelProvider === 'deepseek') {
      const explicitSchemaStr = `
Please output a raw JSON object only. The JSON must exactly match the structure:
{
  "mappings": [
    {
      "matchId": "string",
      "fixtureId": 0
    }
  ]
}
`;
      const dsRes = await fetch('/api/deepseek', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are an expert sports data matcher. ' + explicitSchemaStr
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1
        })
      });

      if (!dsRes.ok) {
        throw new Error("DeepSeek API failed: " + dsRes.status);
      }
      const dsData = await dsRes.json();
      text = dsData.choices[0]?.message?.content || '';
    } else {
      const response = await fetch("/api/gemini/generate", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseSchema: {
              type: "OBJECT",
              properties: {
                mappings: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      matchId: { type: "STRING" },
                      fixtureId: { type: "INTEGER" }
                    },
                    required: ['matchId', 'fixtureId']
                  }
                }
              },
              required: ['mappings']
            }
          }
        })
      });
      
      if (!response.ok) {
          throw new Error("Gemini API failed: " + response.status);
      }
      const data = await response.json();
      text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }
    
    if (text) {
      // Remove markdown codeblock artifacts that models sometimes insert
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    }
    const parsed = JSON.parse(text);
    const mapping: Record<string, number> = {};
    for (const item of parsed.mappings || []) {
      mapping[item.matchId] = item.fixtureId;
    }
    return mapping;
  } catch (error) {
    console.error('Error matching fixtures with LLM:', error);
    return {};
  }
}


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
  
  // 0. Enhance with API Football data
  let apiFootballPredictionsContext = '';
  try {
    if (matches.length > 0) {
      const d = new Date();
      // Adjust to UTC since API-Football uses UTC dates
      const dateStr = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
      
      const fixRes = await fetch(`/api/football/fixtures?date=${dateStr}`);
      if (fixRes.ok) {
        const fixtures = await fixRes.json();
        
        // Match them
        const mappings = await matchFixturesWithLLM(matches, fixtures, modelProvider);
        
        // Fetch predictions
        const predictionPromises = Object.entries(mappings).map(async ([matchId, fixtureId]) => {
          const predRes = await fetch(`/api/football/predictions?fixture=${fixtureId}`);
          if (predRes.ok) {
            const predData = await predRes.json();
            return { matchId, predData };
          } else {
            console.warn(`Failed to fetch api-football predictions for fixture=${fixtureId}:`, predRes.status);
          }
          return null;
        });
        
        const results = (await Promise.all(predictionPromises)).filter(Boolean);
        
        if (results.length > 0) {
          apiFootballPredictionsContext = '\n【API-Football 海外深度预测数据】\n' + JSON.stringify(results.map(r => {
            const match = matches.find(m => m.id === r!.matchId);
            return {
              队伍: `${match?.homeTeam} vs ${match?.awayTeam}`,
              API预测胜率: r!.predData?.predictions?.percent,
              API建议推荐: r!.predData?.predictions?.advice,
              主队近期战绩形态: r!.predData?.teams?.home?.league?.form,
              客队近期战绩形态: r!.predData?.teams?.away?.league?.form,
              进球数预测: r!.predData?.predictions?.goals,
              交锋历史表现: r!.predData?.h2h?.length + '场最近交锋记录'
            };
          }), null, 2) + '\n(请在分析时重点结合上述海外专家系统给出的精准数据，例如胜率、预期进球等进行多维度推演)';
        }
      } else {
        const errJson = await fixRes.json().catch(() => ({}));
        console.warn('Failed to fetch api-football fixtures:', fixRes.status, errJson);
      }
    }
  } catch (error) {
    console.error('Failed to enrich matches with api-football:', error);
  }

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
1. 双方本赛季的 xG (期望进球) 和 xGA (期望失球) 数据。
2. 双方历史交锋记录（H2H）
3. 双方核心球员伤停情况（Injuries & Suspensions）
4. 双方近期赛程密集度与体能状况（Schedule & Fatigue）
5. 双方战意与积分榜形势

${apiFootballPredictionsContext}

【逻辑推理与概率微调】
1. 比较基本面与市场预期：如果你发现某队有伤停，或刚踢完欧冠体能极差，应调低其真实概率。
2. xG 修正与泊松模型调整。
3. Dixon-Coles 修正（低比分平局修正）：关注0-0和1-1可能。
4. 亚盘优先原则 (Asian Handicap Focus)：如果亚盘(letOdds)有价值优先推荐亚盘。
5. CLV (Closing Line Value) 预判。
6. 调整后的概率必须满足：home + draw + away = 1.0。
7. 给出你的信心指数（0-100）。
8. 无论 EV 是否达到阈值，请务必为每场比赛选出**最有可能打出且最具价值**的选项（recommendation）。

赛事数据与市场公平概率：
${JSON.stringify(matchesWithFairProb, null, 2)}

请返回一个严格的JSON格式，包含每场比赛的分析（matchAnalyses）和今日的整体分析描述（articleIntro）。
要求：包含具体赛程分析，客观专业。不含“赌博、赚钱”等敏感词。
`;

  try {
    let text = '';

    if (modelProvider === 'deepseek') {
      const explicitSchemaStr = `
You MUST return ONLY valid JSON matching this exact structure:
{
  "articleIntro": "string (Overall analysis)",
  "matchAnalyses": [
    {
      "matchId": "string (The match ID)",
      "recommendation": "string (must be one of: 'home', 'draw', 'away', 'letHome', 'letDraw', 'letAway', 'pass')",
      "adjustedProbabilities": { "home": number, "draw": number, "away": number },
      "confidence": number,
      "reasoning": "string",
      "expectedValue": number,
      "goalsData": "string",
      "h2hData": "string",
      "scheduleData": "string",
      "clvPotential": "string"
    }
  ]
}`;
      const dsRes = await fetch('/api/deepseek', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek-v4-pro',
          messages: [
            {
              role: 'system',
              content: 'You are a professional football data analyst. ' + explicitSchemaStr
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
        const errJson = await dsRes.json().catch(() => ({}));
        throw new Error(`DeepSeek API failed: ${dsRes.status} ${errJson.error || ''}`);
      }

      const dsData = await dsRes.json();
      text = dsData.choices[0]?.message?.content || '';

    } else {
      const resp = await fetch("/api/gemini/generate", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            topK: 1,
            topP: 0.95,
            responseMimeType: 'application/json',
            responseSchema: {
              type: "OBJECT",
              properties: {
                matchAnalyses: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      matchId: { type: "STRING" },
                      recommendation: { type: "STRING" },
                      adjustedProbabilities: {
                        type: "OBJECT",
                        properties: {
                          home: { type: "NUMBER" },
                          draw: { type: "NUMBER" },
                          away: { type: "NUMBER" }
                        },
                        required: ['home', 'draw', 'away']
                      },
                      confidence: { type: "NUMBER" },
                      reasoning: { type: "STRING" },
                      expectedValue: { type: "NUMBER" },
                      goalsData: { type: "STRING" },
                      h2hData: { type: "STRING" },
                      scheduleData: { type: "STRING" },
                      clvPotential: { type: "STRING" }
                    },
                    required: ['matchId', 'recommendation', 'adjustedProbabilities', 'confidence', 'reasoning', 'expectedValue', 'goalsData', 'h2hData', 'scheduleData', 'clvPotential']
                  }
                },
                articleIntro: { type: "STRING" }
              },
              required: ['matchAnalyses', 'articleIntro']
            }
          },
          tools: [{ googleSearch: {} }]
        })
      });
      if (!resp.ok) {
        throw new Error("Gemini API failed: " + resp.status);
      }
      const data = await resp.json();
      text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    if (!text) throw new Error('No response from AI');
    
    // Remove markdown codeblock artifacts that deepseek/gemini sometimes insert
    if (text) {
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
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

    const getProb = (p: Prediction) => {
      // 按照用户需求：“最稳的2场”，直接利用AI的 confidence 作为胜率
      return Math.min(Math.max((p.confidence || 50) / 100, 0.01), 0.99);
    };

    const enrichedPredictions = predictions.map(p => {
      const m = matches.find(m => m.id === p.matchId)!;
      const odds = getOdds(p, m);
      const prob = getProb(p);
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

        // 寻找赔率大概在 1.7 到 4.0 之间的组合，首要前提是保证组合胜率最高（最稳）
        if (totalOdds >= 1.7 && totalOdds <= 4.0 && combinedProb > maxProbForValidOdds) {
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
