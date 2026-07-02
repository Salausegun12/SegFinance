import "dotenv/config";
import express from "express";
import path from "path";
import cors from "cors";
import cron from "node-cron";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/user";
import transactionRoutes from "./routes/transactions";
import analyticsRoutes from "./routes/analytics";
import budgetRoutes from "./routes/budgets";
import prisma from "./config/prisma";

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

app.use("/auth", authRoutes);
app.use("/", userRoutes);
app.use("/transactions", transactionRoutes);
app.use("/", analyticsRoutes);
app.use("/budgets", budgetRoutes);

app.get("/", (_req, res) => {
  res.json({ message: "SegFinance API" });
});

cron.schedule("0 0 * * *", async () => {
  console.log("[Cron] Checking budget thresholds...");
  try {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const [y, m] = month.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59, 999);

    const budgets = await prisma.budget.findMany({ where: { month } });

    if (budgets.length === 0) {
      console.log("[Cron] No budgets found for this month");
      return;
    }

    const categories = budgets.map((b) => b.category);
    const spentGroup = await prisma.transaction.groupBy({
      by: ["category", "userId"],
      where: {
        type: "EXPENSE",
        date: { gte: start, lte: end },
        category: { in: categories },
      },
      _sum: { amount: true },
    });

    const spentByUserCategory: Record<string, Record<string, number>> = {};
    for (const g of spentGroup) {
      if (!spentByUserCategory[g.userId]) spentByUserCategory[g.userId] = {};
      spentByUserCategory[g.userId][g.category] = Number(g._sum.amount ?? 0);
    }

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86_400_000 - 1);

    for (const budget of budgets) {
      const spent = spentByUserCategory[budget.userId]?.[budget.category] ?? 0;
      const ratio = Number(budget.limitAmount) > 0 ? spent / Number(budget.limitAmount) : 0;

      if (ratio >= 0.8) {
        const existingNotification = await prisma.notification.findFirst({
          where: {
            userId: budget.userId,
            body: { contains: budget.category },
            createdAt: { gte: todayStart, lte: todayEnd },
          },
        });

        if (!existingNotification) {
          await prisma.notification.create({
            data: {
              userId: budget.userId,
              title: "Budget Alert",
              body: `You're nearing your ${budget.category} budget`,
            },
          });
          console.log(`[Cron] Notification created for user ${budget.userId} — ${budget.category}`);
        }
      }
    }
  } catch (err) {
    console.error("[Cron] Error checking budgets:", err);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
