import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import * as cheerio from 'cheerio';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/deepseek', async (req, res) => {
    try {
      // 优先从环境变量获取，如果没有则使用用户提供的固定 Key
      const apiKey = process.env.DEEPSEEK_API_KEY || 'sk-7ebd4fa7837f449eae338812a01f1c5e';
      if (!apiKey) {
        return res.status(400).json({ error: 'DeepSeek API Key is missing. Please add it to your environment variables.' });
      }

      console.log('Forwarding request to DeepSeek API...');
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(req.body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('DeepSeek API error:', response.status, errorText);
        return res.status(response.status).json({ error: `DeepSeek API failed: ${response.status}`, details: errorText });
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error('Error in /api/deepseek:', error);
      res.status(500).json({ error: 'Failed to connect to DeepSeek API', details: error.message });
    }
  });

  app.post('/api/gemini/generate', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: 'Gemini API Key is missing. Please add it to your environment variables.' });
      }

      console.log('Forwarding request to Gemini API...');
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', response.status, errorText);
        return res.status(response.status).json({ error: `Gemini API failed: ${response.status}`, details: errorText });
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error('Error in /api/gemini/generate:', error);
      res.status(500).json({ error: 'Failed to connect to Gemini API', details: error.message });
    }
  });

  const apiFootballCache = new Map();

  app.get('/api/football/fixtures', async (req, res) => {
    const { date } = req.query; 
    const apiKey = process.env.API_FOOTBALL_KEY || 'fe6cf972b7bd0cbf23960cd2360b30b0';
    const cacheKey = `fixtures_${date}`;
    
    if (apiFootballCache.has(cacheKey)) {
      return res.json(apiFootballCache.get(cacheKey));
    }

    try {
      console.log(`Fetching fixtures from api-football for date: ${date}`);
      const response = await fetch(`https://v3.football.api-sports.io/fixtures?date=${date}`, {
        headers: { 'x-apisports-key': apiKey }
      });
      const data = await response.json() as any;
      
      if (data.errors && Object.keys(data.errors).length > 0) {
        return res.status(400).json({ error: 'API Football error', details: data.errors });
      }
      
      // Condense data
      const condensed = (data.response || []).map((f: any) => ({
        id: f.fixture.id,
        time: f.fixture.date,
        league: f.league.name,
        country: f.league.country,
        home: f.teams.home.name,
        away: f.teams.away.name
      }));
      
      apiFootballCache.set(cacheKey, condensed);
      res.json(condensed);
    } catch (error: any) {
      console.error('Error fetching api-football fixtures:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/football/predictions', async (req, res) => {
    const { fixture } = req.query;
    const apiKey = process.env.API_FOOTBALL_KEY || 'fe6cf972b7bd0cbf23960cd2360b30b0';
    const cacheKey = `predictions_${fixture}`;
    
    if (apiFootballCache.has(cacheKey)) {
      return res.json(apiFootballCache.get(cacheKey));
    }

    try {
      console.log(`Fetching predictions from api-football for fixture: ${fixture}`);
      const response = await fetch(`https://v3.football.api-sports.io/predictions?fixture=${fixture}`, {
        headers: { 'x-apisports-key': apiKey }
      });
      const data = await response.json() as any;
      
      if (data.errors && Object.keys(data.errors).length > 0) {
        return res.status(400).json({ error: 'API Football error', details: data.errors });
      }

      if (!data.response || data.response.length === 0) {
        return res.json(null);
      }

      const predictionData = data.response[0];
      apiFootballCache.set(cacheKey, predictionData);
      res.json(predictionData);
    } catch (error: any) {
      console.error('Error fetching api-football predictions:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/matches/html', async (req, res) => {
    try {
      console.log('Fetching matches from zgzcw...');
      
      const response = await fetch('https://cp.zgzcw.com/lottery/jchtplayvsForJsp.action?lotteryId=47');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch matches: ${response.status}`);
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      const matches: any[] = [];
      
      // Calculate current Beijing time day of week
      const now = new Date();
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const bjTime = new Date(utc + (3600000 * 8));
      const dayStr = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][bjTime.getDay()];
      
      $('tr').each((i, el) => {
        const matchNumEl = $(el).find('td.wh-1 a.ah');
        if (matchNumEl.length === 0) return;
        
        const matchNum = matchNumEl.text().trim();
        
        // Only include today's matches
        if (!matchNum.startsWith(dayStr)) return;
        
        const league = $(el).find('td.wh-2 span').text().trim();
        
        // Try multiple ways to extract time
        let time = '';
        const wh3 = $(el).find('td.wh-3');
        
        const titleAttr = wh3.attr('title');
        if (titleAttr) {
          time = titleAttr.replace(/比赛时间：|比赛时间:|截期时间：|截期时间:/g, '').trim();
        }
        
        if (!time) {
          const matchTimeSpan = wh3.find('span[title^="比赛时间"]').first();
          if (matchTimeSpan.length > 0) {
            time = matchTimeSpan.text().replace(/比赛时间：|比赛时间:/g, '').trim();
          }
        }
        
        if (!time) {
          const cutTimeSpan = wh3.find('span[title^="截期时间"]').first();
          if (cutTimeSpan.length > 0) {
            time = cutTimeSpan.text().replace(/截期时间：|截期时间:/g, '').trim();
          }
        }
        
        if (!time) {
          // If it's just text, it might contain multiple times, just take the first one that looks like a time
          const text = wh3.text().trim();
          const timeMatch = text.match(/\d{2}:\d{2}/);
          if (timeMatch) {
             time = timeMatch[0];
          } else {
             time = text;
          }
        }
        
        // Extract just the HH:mm part if it exists, to avoid duplicate times or dates
        const finalTimeMatch = time.match(/\d{2}:\d{2}/);
        if (finalTimeMatch) {
          time = finalTimeMatch[0];
        }
        
        const homeTeam = $(el).find('td.wh-4 a').text().trim();
        const awayTeam = $(el).find('td.wh-6 a').text().trim();
        
        // Find the hidden input with odds
        const idMatch = $(el).find('td.wh-1 a.ah').attr('id')?.match(/show_(\d+)/);
        if (!idMatch) return;
        const matchId = idMatch[1];
        
        const spsInput = $(el).find(`#sps_${matchId}`).val() as string;
        if (!spsInput) return;
        
        const spsParts = spsInput.split('|');
        if (spsParts.length < 5) return;
        
        const letOddsArr = spsParts[0].split(' ').map(Number);
        const stdOddsArr = spsParts[1].split(' ').map(Number);
        const totalGoalsArr = spsParts[2].split(' ').map(Number);
        const halfFullArr = spsParts[3].split(' ').map(Number);
        const scoreArr = spsParts[4].split(' ').map(Number);
        
        const letCountText = $(el).find('.area-bot .rq').text().trim();
        const letCount = letCountText ? parseInt(letCountText, 10) : 0;
        
        matches.push({
          id: matchId,
          matchNum,
          league,
          time,
          homeTeam,
          awayTeam,
          odds: {
            home: stdOddsArr[0],
            draw: stdOddsArr[1],
            away: stdOddsArr[2]
          },
          letOdds: {
            letCount,
            home: letOddsArr[0],
            draw: letOddsArr[1],
            away: letOddsArr[2]
          },
          totalGoalsOdds: totalGoalsArr,
          halfFullOdds: halfFullArr,
          scoreOdds: scoreArr,
          homeForm: [],
          awayForm: [],
          homeRank: 0,
          awayRank: 0
        });
      });

      res.json(matches);
    } catch (error: any) {
      console.error('Error in /api/matches/html:', error);
      res.status(500).json({ error: 'Failed to fetch matches', details: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
