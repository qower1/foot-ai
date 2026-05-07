async function test() {
  try {
    const fixtureId = 1535283;
    const res = await fetch(`http://localhost:3000/api/football/predictions?fixture=${fixtureId}`);
    const text = await res.text();
    console.log('STATUS:', res.status);
    console.log('TEXT:', text.substring(0, 100));
  } catch (e) {
    console.error(e);
  }
}
test();
