async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/deepseek', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test: true })
    });
    const text = await res.text();
    console.log('STATUS:', res.status);
    console.log('TEXT:', text.substring(0, 100));
  } catch (e) {
    console.error(e);
  }
}
test();
