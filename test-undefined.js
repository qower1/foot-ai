async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/football/predictions?fixture=undefined');
    if (!res.ok) {
      console.log('NOT OK:', res.status);
    }
    const text = await res.text();
    console.log('TEXT:', text.substring(0, 100));
  } catch(e) {
    console.error(e);
  }
}
test();
