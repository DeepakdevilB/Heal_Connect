async function poll() {
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch('https://healconnect-backend-dqcsaqf4a6baffaz.centralindia-01.azurewebsites.net/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'deepaksharma.pith@gmail.com', password: 'qwerty123' })
      });
      const text = await res.text();
      console.log(`[${new Date().toISOString()}] ${res.status} ${text}`);
      if (!text.includes('Internal server error') || text.includes('Internal server error:')) {
        break;
      }
    } catch (e) {
      console.log('Error:', e);
    }
    await new Promise(r => setTimeout(r, 5000));
  }
}
poll();
