import { Router, Response } from "express";
import prisma from "../config/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);

const EXPENSE_CATEGORIES = [
  "Food", "Transport", "Fuel", "Airtime", "Internet", "Bills",
  "Rent", "Shopping", "Education", "Entertainment", "Medical",
  "Investment", "Charity", "Others",
];

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { category, limitAmount, month } = req.body as {
      category?: string;
      limitAmount?: number;
      month?: string;
    };

    if (!category || !limitAmount || !month) {
      return res.status(400).json({ message: "category, limitAmount, and month are required" });
    }

    if (!EXPENSE_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: `Invalid category. Must be one of: ${EXPENSE_CATEGORIES.join(", ")}` });
    }

    if (limitAmount <= 0) {
      return res.status(400).json({ message: "limitAmount must be positive" });
    }

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: "month must be in YYYY-MM format" });
    }

    const budget = await prisma.budget.create({
      data: {
        userId: req.userId!,
        category,
        limitAmount,
        month,
      },
    });

    return res.status(201).json(budget);
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const month = req.query.month as string | undefined;
    if (month && !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: "month must be in YYYY-MM format" });
    }

    const whereMonth = month ?? (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    })();

    const budgets = await prisma.budget.findMany({
      where: { userId: req.userId!, month: whereMonth },
      orderBy: { createdAt: "desc" },
    });

    if (budgets.length === 0) {
      return res.json({ data: [] });
    }

    const [y, m] = whereMonth.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59, 999);

    const categories = budgets.map((b) => b.category);
    const spentGroup = await prisma.transaction.groupBy({
      by: ["category"],
      where: {
        userId: req.userId!,
        type: "EXPENSE",
        date: { gte: start, lte: end },
        category: { in: categories },
      },
      _sum: { amount: true },
    });

    const spentMap: Record<string, number> = {};
    for (const g of spentGroup) {
      spentMap[g.category] = Number(g._sum.amount ?? 0);
    }

    const data = budgets.map((b) => ({
      ...b,
      limitAmount: Number(b.limitAmount),
      spent: spentMap[b.category] ?? 0,
    }));

    return res.json({ data });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { category, limitAmount, month } = req.body as {
      category?: string;
      limitAmount?: number;
      month?: string;
    };

    const existing = await prisma.budget.findFirst({
      where: { id, userId: req.userId! },
    });

    if (!existing) {
      return res.status(404).json({ message: "Budget not found" });
    }

    if (category !== undefined && !EXPENSE_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: `Invalid category. Must be one of: ${EXPENSE_CATEGORIES.join(", ")}` });
    }

    if (limitAmount !== undefined && limitAmount <= 0) {
      return res.status(400).json({ message: "limitAmount must be positive" });
    }

    if (month !== undefined && !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: "month must be in YYYY-MM format" });
    }

    const updated = await prisma.budget.update({
      where: { id },
      data: {
        ...(category !== undefined && { category }),
        ...(limitAmount !== undefined && { limitAmount }),
        ...(month !== undefined && { month }),
      },
    });

    return res.json(updated);
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.budget.findFirst({
      where: { id, userId: req.userId! },
    });

    if (!existing) {
      return res.status(404).json({ message: "Budget not found" });
    }

    await prisma.budget.delete({ where: { id } });

    return res.json({ message: "Budget deleted" });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
