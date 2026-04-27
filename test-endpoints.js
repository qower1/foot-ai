import fetch from 'node-fetch';

async function testEndpoint(endpoint) {
  try {
    const res = await fetch(`https://free-api-live-football-data.p.rapidapi.com/${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': 'free-api-live-football-data.p.rapidapi.com',
        'x-rapidapi-key': 'fa1f7e487bmshf84c9f03cb748c0p110433jsn7806db07a783'
      }
    });
    console.log(`Endpoint: ${endpoint} -> Status: ${res.status}`);
    if (res.status === 200) {
      const data = await res.text();
      console.log(data.substring(0, 200));
    }
  } catch (e) {
    console.error(e);
  }
}

async function run() {
  await testEndpoint('football-matches');
  await testEndpoint('football-fixtures');
  await testEndpoint('football-live-matches');
  await testEndpoint('matches');
  await testEndpoint('fixtures');
  await testEndpoint('football-get-matches-by-date?date=2026-04-03');
}

run();
