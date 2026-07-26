import { prisma } from './src/lib/prisma';
import express from 'express';

const app = express();
app.use(express.json());

app.post('/test-login', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { email: req.body.email } });
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, stack: err.stack });
  }
});

app.listen(9999, () => {
  console.log('Listening on 9999');
  fetch('http://localhost:9999/test-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'deepaksharma.pith@gmail.com' })
  }).then(r => r.json()).then(console.log).finally(() => process.exit(0));
});
