import { Router, Response } from "express";
import { Prisma } from "../../generated/prisma/client";
import prisma from "../config/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

const EXPENSE_CATEGORIES = [
  "Food", "Transport", "Fuel", "Airtime", "Internet", "Bills",
  "Rent", "Shopping", "Education", "Entertainment", "Medical",
  "Investment", "Charity", "Others",
];

const INCOME_CATEGORIES = [
  "Salary", "Freelance", "Business", "Gift", "Investment",
];

function validateCategory(type: string, category: string): string | null {
  const list = type === "EXPENSE" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  if (!list.includes(category)) {
    return `Invalid category for ${type.toLowerCase()}. Valid: ${list.join(", ")}`;
  }
  return null;
}

router.use(authMiddleware);

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { amount, type, category, description, paymentMethod, date } = req.body as any;

    if (!amount || !type || !category || !paymentMethod || !date) {
      return res.status(400).json({ message: "amount, type, category, paymentMethod, and date are required" });
    }

    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ message: "amount must be a positive number" });
    }

    if (!["INCOME", "EXPENSE"].includes(type)) {
      return res.status(400).json({ message: "type must be INCOME or EXPENSE" });
    }

    const catError = validateCategory(type, category);
    if (catError) {
      return res.status(400).json({ message: catError });
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId: req.userId!,
        amount,
        type,
        category,
        description: description ?? null,
        paymentMethod,
        date: new Date(date),
      },
    });

    return res.status(201).json({ transaction });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const q = req.query;
    const category = q.category as string | undefined;
    const from = q.from as string | undefined;
    const to = q.to as string | undefined;
    const paymentMethod = q.paymentMethod as string | undefined;
    const search = q.search as string | undefined;
    const sortBy = (q.sortBy as string) || "date";
    const sortOrder = (q.sortOrder as string) || "desc";
    const page = (q.page as string) || "1";
    const limit = (q.limit as string) || "20";

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.TransactionWhereInput = { userId: req.userId! };

    if (category) where.category = category;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }
    if (search) {
      where.description = { contains: search, mode: "insensitive" };
    }

    const allowedSortFields = ["date", "amount", "category", "createdAt"];
    const field = allowedSortFields.includes(sortBy) ? sortBy : "date";
    const order = sortOrder === "asc" ? "asc" : "desc";
    const orderBy: Prisma.TransactionOrderByWithRelationInput = { [field]: order };

    const [data, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.transaction.count({ where }),
    ]);

    return res.json({
      data,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/export", async (req: AuthRequest, res: Response) => {
  try {
    const q = req.query;
    const category = q.category as string | undefined;
    const from = q.from as string | undefined;
    const to = q.to as string | undefined;
    const paymentMethod = q.paymentMethod as string | undefined;
    const search = q.search as string | undefined;
    const sortBy = (q.sortBy as string) || "date";
    const sortOrder = (q.sortOrder as string) || "desc";

    const where: Prisma.TransactionWhereInput = { userId: req.userId! };

    if (category) where.category = category;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }
    if (search) {
      where.description = { contains: search, mode: "insensitive" };
    }

    const allowedSortFields = ["date", "amount", "category", "createdAt"];
    const field = allowedSortFields.includes(sortBy) ? sortBy : "date";
    const order = sortOrder === "asc" ? "asc" : "desc";
    const orderBy: Prisma.TransactionOrderByWithRelationInput = { [field]: order };

    const transactions = await prisma.transaction.findMany({ where, orderBy });

    const header = "id,amount,type,category,description,paymentMethod,date,createdAt";
    const rows = transactions.map((t) =>
      [
        t.id,
        t.amount.toString(),
        t.type,
        t.category,
        `"${(t.description ?? "").replace(/"/g, '""')}"`,
        t.paymentMethod,
        t.date.toISOString(),
        t.createdAt.toISOString(),
      ].join(",")
    );

    const csv = [header, ...rows].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=transactions-${Date.now()}.csv`);
    return res.send(csv);
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const transaction = await prisma.transaction.findFirst({
      where: { id, userId: req.userId! },
    });

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    return res.json({ transaction });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.transaction.findFirst({
      where: { id, userId: req.userId! },
    });

    if (!existing) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const { amount, type, category, description, paymentMethod, date } = req.body as any;
    const data: Record<string, unknown> = {};

    if (amount !== undefined) {
      if (typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({ message: "amount must be a positive number" });
      }
      data.amount = amount;
    }

    if (type !== undefined) {
      if (!["INCOME", "EXPENSE"].includes(type)) {
        return res.status(400).json({ message: "type must be INCOME or EXPENSE" });
      }
      data.type = type;
    }

    if (category !== undefined) {
      const effectiveType = type ?? existing.type;
      const catError = validateCategory(effectiveType, category);
      if (catError) return res.status(400).json({ message: catError });
      data.category = category;
    }

    if (description !== undefined) data.description = description;
    if (paymentMethod !== undefined) data.paymentMethod = paymentMethod;
    if (date !== undefined) data.date = new Date(date);

    if (!Object.keys(data).length) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data,
    });

    return res.json({ transaction });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.transaction.findFirst({
      where: { id, userId: req.userId! },
    });

    if (!existing) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    await prisma.transaction.delete({ where: { id } });

    return res.json({ message: "Transaction deleted" });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
