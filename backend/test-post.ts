import fetch from 'node-fetch';

async function main() {
  // Login
  const loginRes = await fetch('http://localhost:8082/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'abhishekgiri0405@gmail.com',
      password: 'Abhishek@123',
    }),
  });

  const loginData = await loginRes.json() as any;
  if (!loginData.success) {
    console.error('Login failed:', loginData.message);
    return;
  }

  const token = loginData.data.accessToken;
  console.log('Login successful!');

  const practitionerId = '4ba0d313-9e17-4d37-9e2b-38ad1d928bf9';
  console.log('Creating session for practitioner:', practitionerId);

  // Call the sessions endpoint
  const res = await fetch('http://localhost:8082/api/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ practitionerId, type: 'CHAT' }),
  });

  const data = await res.json();
  console.log('--- CREATE SESSION RESPONSE ---');
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
