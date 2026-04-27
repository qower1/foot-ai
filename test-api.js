import fetch from 'node-fetch';

async function test() {
  try {
    const res = await fetch('https://free-api-live-football-data.p.rapidapi.com/football-players-search?search=m', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': 'free-api-live-football-data.p.rapidapi.com',
        'x-rapidapi-key': 'fa1f7e487bmshf84c9f03cb748c0p110433jsn7806db07a783'
      }
    });
    const data = await res.text();
    console.log(data);
  } catch (e) {
    console.error(e);
  }
}

test();
