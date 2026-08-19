import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);
const router = Router();

router.get('/run', async (req: Request, res: Response) => {
  try {
    const { stdout, stderr } = await execPromise('npx prisma migrate deploy');
    res.json({ success: true, message: 'Prisma migrations deployed successfully', stdout, stderr });
  } catch (error: any) {
    console.error(`Migration error:`, error);
    res.status(500).json({ success: false, error: error.message, stdout: error.stdout, stderr: error.stderr });
  }
});

export default router;
