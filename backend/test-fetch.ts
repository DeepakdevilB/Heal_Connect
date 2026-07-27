async function main() {
  const res = await fetch('https://healconnect-backend-dqcsaqf4a6baffaz.centralindia-01.azurewebsites.net/api/practitioners');
  const data = await res.json();
  console.log('--- AZURE DATABASE PRACTITIONERS ---');
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
