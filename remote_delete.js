const script = `
const { prisma } = require('./dist/lib/prisma.js');
async function clear() {
  const ids = (await prisma.practitioner.findMany({})).map(p => p.id);
  if(!ids.length) return console.log('no experts');
  await prisma.flaggedContent.deleteMany({ where: { practitionerId: { in: ids } } });
  await prisma.callTranscript.deleteMany({ where: { practitionerId: { in: ids } } });
  await prisma.callFeedback.deleteMany({ where: { session: { practitionerId: { in: ids } } } });
  await prisma.chatMessage.deleteMany({ where: { session: { practitionerId: { in: ids } } } });
  await prisma.review.deleteMany({ where: { practitionerId: { in: ids } } });
  await prisma.session.deleteMany({ where: { practitionerId: { in: ids } } });
  await prisma.practitioner.deleteMany({ where: { id: { in: ids } } });
  console.log('deleted ' + ids.length + ' experts');
}
clear().then(()=>console.log('done')).catch(console.error);
`;
const b64 = Buffer.from(script).toString('base64');
const cmd = `node -e "eval(Buffer.from('${b64}', 'base64').toString())"`;
fetch('https://healconnect-backend-dqcsaqf4a6baffaz.centralindia-01.azurewebsites.net/api/admin/exec?cmd=' + encodeURIComponent(cmd))
  .then(r => r.text())
  .then(console.log)
  .catch(console.error);
