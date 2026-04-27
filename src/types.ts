export interface Odds {
  home: number;
  draw: number;
  away: number;
}

export interface Match {
  id: string;
  matchNum?: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  time: string;
  odds: Odds;
  letOdds?: {
    letCount: number;
    home: number;
    draw: number;
    away: number;
  };
  totalGoalsOdds?: number[];
  halfFullOdds?: number[];
  scoreOdds?: number[];
  homeForm: string[]; // e.g., ['W', 'D', 'L', 'W', 'W']
  awayForm: string[];
  homeRank: number;
  awayRank: number;
  status: 'upcoming' | 'live' | 'finished';
  score?: {
    home: number;
    away: number;
  };
}

export interface Prediction {
  matchId: string;
  recommendation: 'home' | 'draw' | 'away' | 'letHome' | 'letDraw' | 'letAway' | 'over' | 'under' | 'pass';
  confidence: number; // 0-100
  reasoning: string;
  expectedValue: number;
  goalsData?: string;
  h2hData?: string;
  scheduleData?: string;
  clvPotential?: string;
}

export interface BettingStrategy {
  date: string;
  type: 'single' | 'accumulator'; // 单关 / 串关
  matches: string[]; // Match IDs
  totalOdds: number;
  suggestedStake: number; // units or percentage
  expectedReturn: number;
  reasoning: string;
}

export interface HistoryRecord {
  id: string;
  date: string;
  strategy: BettingStrategy;
  predictions: Prediction[];
  matches?: Match[];
  status: 'pending' | 'won' | 'lost';
  actualReturn?: number;
}
