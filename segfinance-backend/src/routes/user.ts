import { Router, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import prisma from "../config/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

const uploadsDir = path.resolve(__dirname, "../../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

router.get(
  "/me",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
          currency: true,
          monthlyIncome: true,
          financialGoalAmount: true,
          createdAt: true,
        },
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.json({ user });
    } catch {
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.patch(
  "/me",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { name, currency, monthlyIncome, financialGoalAmount } = req.body;

      const data: Record<string, unknown> = {};
      if (name !== undefined) data.name = name;
      if (currency !== undefined) data.currency = currency;
      if (monthlyIncome !== undefined) data.monthlyIncome = monthlyIncome;
      if (financialGoalAmount !== undefined) data.financialGoalAmount = financialGoalAmount;

      if (!Object.keys(data).length) {
        return res.status(400).json({ message: "No fields to update" });
      }

      const user = await prisma.user.update({
        where: { id: req.userId },
        data,
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
          currency: true,
          monthlyIncome: true,
          financialGoalAmount: true,
          createdAt: true,
        },
      });

      return res.json({ user });
    } catch {
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.post(
  "/me/photo",
  authMiddleware,
  upload.single("photo"),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Photo file is required" });
      }

      const photoUrl = `/uploads/${req.file.filename}`;

      const user = await prisma.user.update({
        where: { id: req.userId },
        data: { photoUrl },
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
          currency: true,
          monthlyIncome: true,
          financialGoalAmount: true,
          createdAt: true,
        },
      });

      return res.json({ user });
    } catch {
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

export default router;
