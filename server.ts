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
