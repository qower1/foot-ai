import fetch from 'node-fetch';

async function run() {
  const res = await fetch('https://free-api-live-football-data.p.rapidapi.com/', {
    headers: {
      'x-rapidapi-host': 'free-api-live-football-data.p.rapidapi.com',
      'x-rapidapi-key': 'fa1f7e487bmshf84c9f03cb748c0p110433jsn7806db07a783'
    }
  });
  console.log(res.status);
  const data = await res.text();
  console.log(data.substring(0, 500));
}
run();
