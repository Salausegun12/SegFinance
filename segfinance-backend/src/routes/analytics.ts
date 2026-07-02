import { Router, Response } from "express";
import prisma from "../config/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);

function getMonthRange(monthStr: string | undefined): { start: Date; end: Date } {
  if (monthStr && /^\d{4}-\d{2}$/.test(monthStr)) {
    const [y, m] = monthStr.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59, 999);
    return { start, end };
  }
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

router.get("/dashboard", async (req: AuthRequest, res: Response) => {
  try {
    const month = req.query.month as string | undefined;
    const { start, end } = getMonthRange(month);
    const userId = req.userId!;

    const monthAgg = await prisma.transaction.aggregate({
      where: { userId, date: { gte: start, lte: end } },
      _sum: { amount: true },
    });

    const incomeAgg = await prisma.transaction.aggregate({
      where: { userId, date: { gte: start, lte: end }, type: "INCOME" },
      _sum: { amount: true },
    });

    const expenseAgg = await prisma.transaction.aggregate({
      where: { userId, date: { gte: start, lte: end }, type: "EXPENSE" },
      _sum: { amount: true },
    });

    const totalIncomeAll = await prisma.transaction.aggregate({
      where: { userId, type: "INCOME" },
      _sum: { amount: true },
    });

    const totalExpenseAll = await prisma.transaction.aggregate({
      where: { userId, type: "EXPENSE" },
      _sum: { amount: true },
    });

    const totalIncome = Number(incomeAgg._sum.amount ?? 0);
    const totalExpenses = Number(expenseAgg._sum.amount ?? 0);
    const totalSavings = totalIncome - totalExpenses;

    const totalIncomeAllTime = Number(totalIncomeAll._sum.amount ?? 0);
    const totalExpenseAllTime = Number(totalExpenseAll._sum.amount ?? 0);
    const totalBalance = totalIncomeAllTime - totalExpenseAllTime;

    const monthNum = start.getMonth() + 1;
    const yearNum = start.getFullYear();
    const monthLabel = `${yearNum}-${String(monthNum).padStart(2, "0")}`;

    const budgets = await prisma.budget.findMany({
      where: { userId, month: monthLabel },
    });

    const budgetCategories = budgets.map((b) => b.category);
    const spentByCategory = await prisma.transaction.groupBy({
      by: ["category"],
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: start, lte: end },
        category: { in: budgetCategories },
      },
      _sum: { amount: true },
    });

    const spentMap: Record<string, number> = {};
    for (const s of spentByCategory) {
      spentMap[s.category] = Number(s._sum.amount ?? 0);
    }

    const totalBudgetLimit = budgets.reduce((sum, b) => sum + Number(b.limitAmount), 0);
    const totalBudgetSpent = Object.values(spentMap).reduce((sum, v) => sum + v, 0);
    const remainingBudget = totalBudgetLimit - totalBudgetSpent;

    const numDays = daysInMonth(yearNum, monthNum);
    const dailySpendingAverage = numDays > 0 ? totalExpenses / numDays : 0;

    return res.json({
      totalBalance,
      totalIncome,
      totalExpenses,
      totalSavings,
      remainingBudget,
      dailySpendingAverage,
    });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/category-breakdown", async (req: AuthRequest, res: Response) => {
  try {
    const month = req.query.month as string | undefined;
    const { start, end } = getMonthRange(month);
    const userId = req.userId!;

    const breakdown = await prisma.transaction.groupBy({
      by: ["category"],
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: start, lte: end },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
    });

    const data = breakdown.map((b) => ({
      category: b.category,
      total: Number(b._sum.amount ?? 0),
    }));

    return res.json({ data });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/trend", async (req: AuthRequest, res: Response) => {
  try {
    const range = req.query.range as string | undefined;
    const userId = req.userId!;

    let data: { label: string; income: number; expenses: number }[];

    if (range === "weekly") {
      const rows = await prisma.$queryRawUnsafe<
        { week: string; income: string; expenses: string }[]
      >(
        `SELECT
          to_char(date_trunc('week', "date"), 'YYYY-MM-DD') AS week,
          COALESCE(SUM(CASE WHEN "type" = 'INCOME' THEN "amount" ELSE 0 END), 0) AS income,
          COALESCE(SUM(CASE WHEN "type" = 'EXPENSE' THEN "amount" ELSE 0 END), 0) AS expenses
        FROM "Transaction"
        WHERE "userId" = $1
          AND "date" >= date_trunc('week', CURRENT_DATE) - INTERVAL '6 weeks'
        GROUP BY date_trunc('week', "date")
        ORDER BY week ASC`,
        [userId]
      );

      data = rows.map((r) => ({
        label: r.week,
        income: parseFloat(r.income),
        expenses: parseFloat(r.expenses),
      }));

      const now = new Date();
      const currentWeekStart = new Date(now);
      currentWeekStart.setDate(now.getDate() - now.getDay());
      currentWeekStart.setHours(0, 0, 0, 0);

      for (let i = 0; i < 7; i++) {
        const weekStart = new Date(currentWeekStart);
        weekStart.setDate(weekStart.getDate() - (6 - i) * 7);
        const label = weekStart.toISOString().slice(0, 10);
        if (!data.find((d) => d.label === label)) {
          data.push({ label, income: 0, expenses: 0 });
        }
      }

      data.sort((a, b) => a.label.localeCompare(b.label));
    } else {
      const rows = await prisma.$queryRawUnsafe<
        { month: string; income: string; expenses: string }[]
      >(
        `SELECT
          to_char(date_trunc('month', "date"), 'YYYY-MM') AS month,
          COALESCE(SUM(CASE WHEN "type" = 'INCOME' THEN "amount" ELSE 0 END), 0) AS income,
          COALESCE(SUM(CASE WHEN "type" = 'EXPENSE' THEN "amount" ELSE 0 END), 0) AS expenses
        FROM "Transaction"
        WHERE "userId" = $1
          AND "date" >= date_trunc('month', CURRENT_DATE) - INTERVAL '11 months'
        GROUP BY date_trunc('month', "date")
        ORDER BY month ASC`,
        [userId]
      );

      data = rows.map((r) => ({
        label: r.month,
        income: parseFloat(r.income),
        expenses: parseFloat(r.expenses),
      }));

      const now = new Date();
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
        const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!data.find((d) => d.label === label)) {
          data.push({ label, income: 0, expenses: 0 });
        }
      }

      data.sort((a, b) => a.label.localeCompare(b.label));
    }

    return res.json({ data });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
