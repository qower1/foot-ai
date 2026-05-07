async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/matches/html');
    const text = await res.text();
    console.log('STATUS:', res.status);
    console.log('TEXT:', text.substring(0, 100));
  } catch (e) {
    console.error(e);
  }
}
test();
