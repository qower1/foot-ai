import fetch from 'node-fetch';

async function testEndpoint(endpoint) {
  try {
    const res = await fetch(`https://free-api-live-football-data.p.rapidapi.com/${endpoint}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'free-api-live-football-data.p.rapidapi.com',
        'x-rapidapi-key': 'fa1f7e487bmshf84c9f03cb748c0p110433jsn7806db07a783'
      }
    });
    console.log(`Endpoint: ${endpoint} -> Status: ${res.status}`);
    if (res.status === 200) {
      const data = await res.text();
      console.log(data.substring(0, 500));
    }
  } catch (e) {
    console.error(e);
  }
}

async function run() {
  await testEndpoint('football-get-match-odds?matchId=4830708');
  await testEndpoint('football-get-match-h2h?matchId=4830708');
  await testEndpoint('football-get-match-stats?matchId=4830708');
}

run();
