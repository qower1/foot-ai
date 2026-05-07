async function test() {
  try {
    const res = await fetch(`https://v3.football.api-sports.io/fixtures?date=2026-05-06`, {
      headers: { 'x-apisports-key': 'badkey' }
    });
    const text = await res.text();
    console.log('STATUS:', res.status);
    console.log('TEXT:', text.substring(0, 100));
  } catch (e) {
    console.error(e);
  }
}
test();
