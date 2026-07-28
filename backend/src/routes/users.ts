import { Router, type Response } from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import { prisma } from '../lib/prisma';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { handleValidation } from '../middleware/validate';
import { uploadProfilePhoto, deleteProfilePhoto } from '../lib/azure';

interface MulterRequest extends AuthRequest {
  file?: Express.Multer.File | undefined;
}

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/users/me
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true, email: true, name: true, phone: true, dob: true,
        birthPlace: true, gender: true, wellnessInterests: true,
        photoUrl: true, isEmailVerified: true, provider: true, createdAt: true,
      },
    });
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
    res.json({ success: true, data: { user } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PATCH /api/users/me
router.patch(
  '/me',
  requireAuth,
  [
    body('name').optional().trim().notEmpty(),
    body('dob').optional().isISO8601().toDate(),
    body('birthPlace').optional().trim(),
    body('gender').optional().isIn(['male', 'female', 'non-binary', 'prefer_not_to_say']),
    body('wellnessInterests').optional().isArray(),
    body('phone').optional().isMobilePhone('any'),
  ],
  handleValidation,
  async (req: AuthRequest, res: Response) => {
    const body = (req.body || {}) as {
      name?: string; dob?: Date; birthPlace?: string;
      gender?: string; wellnessInterests?: string[]; phone?: string;
    };

    // Build update data only with defined fields (exactOptionalPropertyTypes safe)
    const data: Parameters<typeof prisma.user.update>[0]['data'] = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.dob !== undefined) data.dob = body.dob;
    if (body.birthPlace !== undefined) data.birthPlace = body.birthPlace;
    if (body.gender !== undefined) data.gender = body.gender;
    if (body.wellnessInterests !== undefined) data.wellnessInterests = { set: body.wellnessInterests };
    if (body.phone !== undefined) data.phone = body.phone;

    try {
      const user = await prisma.user.update({
        where: { id: req.user!.userId },
        data,
        select: {
          id: true, email: true, name: true, phone: true, dob: true,
          birthPlace: true, gender: true, wellnessInterests: true,
          photoUrl: true, isEmailVerified: true,
        },
      });
      res.json({ success: true, data: { user } });
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === 'P2002') {
        res.status(409).json({ success: false, message: 'Phone number already in use' });
        return;
      }
      console.error(err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// POST /api/users/me/photo
router.post(
  '/me/photo',
  requireAuth,
  upload.single('photo'),
  async (req: MulterRequest, res: Response) => {
    if (!req.file) { res.status(400).json({ success: false, message: 'No file uploaded' }); return; }

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(req.file.mimetype)) {
      res.status(400).json({ success: false, message: 'Only JPEG, PNG, or WebP allowed' });
      return;
    }

    try {
      const existing = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { photoUrl: true },
      });

      if (existing?.photoUrl) await deleteProfilePhoto(existing.photoUrl);

      const photoUrl = await uploadProfilePhoto(req.file.buffer, req.file.mimetype, 'users');
      await prisma.user.update({ where: { id: req.user!.userId }, data: { photoUrl } });

      res.json({ success: true, data: { photoUrl } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Photo upload failed' });
    }
  }
);

// DELETE /api/users/me/photo
router.delete('/me/photo', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { photoUrl: true },
    });
    if (user?.photoUrl) {
      await deleteProfilePhoto(user.photoUrl);
      await prisma.user.update({ where: { id: req.user!.userId }, data: { photoUrl: null } });
    }
    res.json({ success: true, message: 'Photo removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// DELETE /api/users/me
router.delete('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { photoUrl: true },
    });
    if (user?.photoUrl) await deleteProfilePhoto(user.photoUrl);
    await prisma.user.delete({ where: { id: req.user!.userId } });
    res.json({ success: true, message: 'Account deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
