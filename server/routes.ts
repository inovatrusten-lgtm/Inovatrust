import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { sendWithdrawalReceipt } from "./email";

const SALT_ROUNDS = 10;

const STAKING_PLANS = [
  { periodDays: "1", roiPercent: "3.80", label: "1 Day" },
  { periodDays: "7", roiPercent: "5.30", label: "7 Days" },
  { periodDays: "14", roiPercent: "8.50", label: "14 Days" },
  { periodDays: "21", roiPercent: "12.00", label: "21 Days" },
  { periodDays: "100", roiPercent: "45.00", label: "100 Days" },
  { periodDays: "365", roiPercent: "120.00", label: "365 Days" },
];

function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `INV-${year}${month}${day}-${random}`;
}

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

const rooms = new Map<string, Set<WebSocket>>();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws) => {
    let currentRoom: string | null = null;

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === "join") {
          const conversationId = message.conversationId;
          if (currentRoom) {
            rooms.get(currentRoom)?.delete(ws);
          }
          currentRoom = conversationId;
          if (!rooms.has(conversationId)) {
            rooms.set(conversationId, new Set());
          }
          rooms.get(conversationId)?.add(ws);
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", () => {
      if (currentRoom) {
        rooms.get(currentRoom)?.delete(ws);
      }
    });
  });

  const requireAuth = (req: Request, res: Response, next: Function) => {
    if (!req.session.userId) {
      return res.status(401).send("Unauthorized");
    }
    next();
  };

  const requireAdmin = async (req: Request, res: Response, next: Function) => {
    if (!req.session.userId) {
      return res.status(401).send("Unauthorized");
    }
    const user = await storage.getUser(req.session.userId);
    if (!user?.isAdmin) {
      return res.status(403).send("Forbidden");
    }
    next();
  };

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password, fullName, email } = req.body;
      
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(400).send("Username already exists");
      }

      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      const user = await storage.createUser({ username, password: hashedPassword, fullName, email });
      req.session.userId = user.id;
      res.json(user);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).send("Invalid credentials");
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).send("Invalid credentials");
      }

      req.session.userId = user.id;
      res.json(user);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).send("Not authenticated");
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).send("User not found");
    }
    res.json(user);
  });

  app.get("/api/investments", requireAuth, async (req, res) => {
    const investments = await storage.getInvestmentsByUserId(req.session.userId!);
    res.json(investments);
  });

  app.post("/api/investments", requireAuth, async (req, res) => {
    try {
      const { packageName, amount, dailyReturn, duration } = req.body;
      const userId = req.session.userId!;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).send("User not found");
      }

      const balance = parseFloat(user.balance || "0");
      const investAmount = parseFloat(amount);

      if (investAmount > balance) {
        return res.status(400).send("Insufficient balance");
      }

      const investment = await storage.createInvestment({
        userId,
        packageName,
        amount,
        dailyReturn,
        duration,
      });

      await storage.updateUser(userId, {
        balance: (balance - investAmount).toFixed(2),
        totalInvested: (parseFloat(user.totalInvested || "0") + investAmount).toFixed(2),
      });

      await storage.createTransaction({
        userId,
        type: "investment",
        amount,
        description: `Investment in ${packageName} package`,
      });

      res.json(investment);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.get("/api/transactions", requireAuth, async (req, res) => {
    const transactions = await storage.getTransactionsByUserId(req.session.userId!);
    res.json(transactions);
  });

  app.get("/api/withdrawals", requireAuth, async (req, res) => {
    const withdrawals = await storage.getWithdrawalsByUserId(req.session.userId!);
    res.json(withdrawals);
  });

  app.get("/api/withdrawals/:id", requireAuth, async (req, res) => {
    const withdrawalId = req.params.id;
    const userId = req.session.userId!;
    
    const withdrawals = await storage.getWithdrawalsByUserId(userId);
    const withdrawal = withdrawals.find(w => w.id === withdrawalId);
    
    if (!withdrawal) {
      return res.status(404).send("Withdrawal not found");
    }
    
    res.json(withdrawal);
  });

  app.post("/api/withdrawals", requireAuth, async (req, res) => {
    try {
      const { amount, method, walletAddress } = req.body;
      const userId = req.session.userId!;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).send("User not found");
      }

      const balance = parseFloat(user.balance || "0");
      const withdrawAmount = parseFloat(amount);

      if (withdrawAmount > balance) {
        return res.status(400).send("Insufficient balance");
      }

      if (withdrawAmount < 5) {
        return res.status(400).send("Minimum withdrawal is $5");
      }

      const conversation = await storage.createConversation({
        userId,
        subject: `Withdrawal Request - $${withdrawAmount}`,
      });

      await storage.createMessage({
        conversationId: conversation.id,
        senderId: "system",
        senderType: "admin",
        message: `Hello! Your withdrawal request for $${withdrawAmount.toFixed(2)} via ${method} has been submitted. An admin will review your request shortly.`,
      });

      const withdrawal = await storage.createWithdrawal({
        userId,
        amount,
        method,
        walletAddress,
        conversationId: conversation.id,
      });

      res.json(withdrawal);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.get("/api/conversations", requireAuth, async (req, res) => {
    const conversations = await storage.getConversationsByUserId(req.session.userId!);
    res.json(conversations);
  });

  app.post("/api/conversations", requireAuth, async (req, res) => {
    try {
      const { subject } = req.body;
      const userId = req.session.userId!;
      
      const conversation = await storage.createConversation({ userId, subject });
      res.json(conversation);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.get("/api/chat/:conversationId/messages", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const conversationId = req.params.conversationId;
      
      const user = await storage.getUser(userId);
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).send("Conversation not found");
      }
      
      if (conversation.userId !== userId && !user?.isAdmin) {
        return res.status(403).send("Access denied");
      }
      
      const messages = await storage.getMessagesByConversationId(conversationId);
      res.json(messages);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/chat/:conversationId/messages", requireAuth, async (req, res) => {
    try {
      const { message } = req.body;
      const userId = req.session.userId!;
      const conversationId = req.params.conversationId;

      const user = await storage.getUser(userId);
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).send("Conversation not found");
      }
      
      if (conversation.userId !== userId && !user?.isAdmin) {
        return res.status(403).send("Access denied");
      }

      const senderType = user?.isAdmin ? "admin" : "user";

      const msg = await storage.createMessage({
        conversationId,
        senderId: userId,
        senderType,
        message,
      });

      const room = rooms.get(conversationId);
      if (room) {
        const broadcast = JSON.stringify({ type: "message", message: msg });
        room.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(broadcast);
          }
        });
      }

      res.json(msg);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.get("/api/admin/withdrawals", requireAdmin, async (req, res) => {
    const allWithdrawals = await storage.getAllWithdrawals();
    const users = await storage.getAllUsers();
    
    const withdrawalsWithUsers = allWithdrawals.map((w) => ({
      ...w,
      user: users.find((u) => u.id === w.userId),
    }));
    
    res.json(withdrawalsWithUsers);
  });

  app.patch("/api/admin/withdrawals/:id", requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      const withdrawalId = req.params.id;

      const allWithdrawals = await storage.getAllWithdrawals();
      const withdrawal = allWithdrawals.find((w) => w.id === withdrawalId);
      
      if (!withdrawal) {
        return res.status(404).send("Withdrawal not found");
      }

      let invoiceNumber: string | undefined;
      
      if (status === "approved") {
        const user = await storage.getUser(withdrawal.userId);
        if (user) {
          const balance = parseFloat(user.balance || "0");
          const amount = parseFloat(withdrawal.amount);
          await storage.updateUser(withdrawal.userId, {
            balance: (balance - amount).toFixed(2),
          });

          await storage.createTransaction({
            userId: withdrawal.userId,
            type: "withdrawal",
            amount: withdrawal.amount,
            description: `Withdrawal via ${withdrawal.method} - Approved`,
          });
          
          invoiceNumber = generateInvoiceNumber();
        }
      }

      const processedAt = new Date();
      const updated = await storage.updateWithdrawal(withdrawalId, {
        status,
        processedAt,
        ...(invoiceNumber && { 
          invoiceNumber, 
          invoiceGeneratedAt: new Date() 
        }),
      });

      if (status === "approved" && invoiceNumber) {
        const user = await storage.getUser(withdrawal.userId);
        if (user) {
          const emailSent = await sendWithdrawalReceipt({
            userEmail: user.email,
            userName: user.fullName,
            invoiceNumber,
            amount: withdrawal.amount,
            method: withdrawal.method,
            walletAddress: withdrawal.walletAddress,
            processedAt,
          });
          
          if (emailSent) {
            await storage.updateWithdrawal(withdrawalId, {
              emailSentAt: new Date(),
            });
          }
        }
      }

      if (withdrawal.conversationId) {
        const statusMessage = status === "approved" 
          ? `Great news! Your withdrawal of $${parseFloat(withdrawal.amount).toFixed(2)} has been approved and is being processed.`
          : `We're sorry, but your withdrawal request has been rejected. Please contact support for more information.`;
        
        await storage.createMessage({
          conversationId: withdrawal.conversationId,
          senderId: "system",
          senderType: "admin",
          message: statusMessage,
        });

        const room = rooms.get(withdrawal.conversationId);
        if (room) {
          const msg = await storage.getMessagesByConversationId(withdrawal.conversationId);
          const lastMsg = msg[msg.length - 1];
          const broadcast = JSON.stringify({ type: "message", message: lastMsg });
          room.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(broadcast);
            }
          });
        }
      }

      res.json(updated);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.get("/api/admin/conversations", requireAdmin, async (req, res) => {
    const allConversations = await storage.getAllConversations();
    const users = await storage.getAllUsers();
    
    const conversationsWithUsers = allConversations.map((c) => ({
      ...c,
      user: users.find((u) => u.id === c.userId),
    }));
    
    res.json(conversationsWithUsers);
  });

  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    const users = await storage.getAllUsers();
    res.json(users);
  });

  app.patch("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      const { balance, totalInvested, totalEarnings, stakingEnabled } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).send("User not found");
      }

      const updates: any = {};
      if (balance !== undefined) updates.balance = balance;
      if (totalInvested !== undefined) updates.totalInvested = totalInvested;
      if (totalEarnings !== undefined) updates.totalEarnings = totalEarnings;
      if (stakingEnabled !== undefined) updates.stakingEnabled = stakingEnabled;

      const updated = await storage.updateUser(userId, updates);
      res.json(updated);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.get("/api/staking/plans", requireAuth, async (req, res) => {
    res.json(STAKING_PLANS);
  });

  app.get("/api/staking/status", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) {
      return res.status(404).send("User not found");
    }
    res.json({
      stakingEnabled: user.stakingEnabled || false,
      connectedWallet: user.connectedWallet || null,
    });
  });

  app.post("/api/staking/connect-wallet", requireAuth, async (req, res) => {
    try {
      const { walletAddress } = req.body;
      const userId = req.session.userId!;
      
      await storage.updateUser(userId, { connectedWallet: walletAddress });
      res.json({ success: true, walletAddress });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.get("/api/stakes", requireAuth, async (req, res) => {
    const stakes = await storage.getStakesByUserId(req.session.userId!);
    res.json(stakes);
  });

  app.post("/api/stakes", requireAuth, async (req, res) => {
    try {
      const { amount, currency, network, periodDays, walletAddress, txHash } = req.body;
      const userId = req.session.userId!;
      
      const user = await storage.getUser(userId);
      if (!user?.stakingEnabled) {
        return res.status(403).send("Staking not enabled for your account. Please contact support via chat.");
      }

      const plan = STAKING_PLANS.find(p => p.periodDays === periodDays);
      if (!plan) {
        return res.status(400).send("Invalid staking period");
      }

      const amountNum = parseFloat(amount);
      const roiPercent = parseFloat(plan.roiPercent);
      const expectedReturn = (amountNum * (1 + roiPercent / 100)).toFixed(2);

      const stake = await storage.createStake({
        userId,
        amount,
        currency,
        network,
        periodDays,
        roiPercent: plan.roiPercent,
        expectedReturn,
        walletAddress,
        txHash,
      });

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + parseInt(periodDays));
      
      await storage.updateStake(stake.id, {
        status: "active",
        startDate,
        endDate,
      });

      res.json(stake);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.get("/api/staking/receiving-addresses", requireAuth, async (req, res) => {
    const bep20 = await storage.getPlatformSetting("receiving_wallet_bep20");
    const erc20 = await storage.getPlatformSetting("receiving_wallet_erc20");
    res.json({
      bep20: bep20?.value || null,
      erc20: erc20?.value || null,
    });
  });

  app.post("/api/stakes/:id/request-withdrawal", requireAuth, async (req, res) => {
    try {
      const stakeId = req.params.id;
      const userId = req.session.userId!;

      const stake = await storage.getStake(stakeId);
      if (!stake) {
        return res.status(404).send("Stake not found");
      }
      if (stake.userId !== userId) {
        return res.status(403).send("Unauthorized");
      }
      if (stake.status !== "active") {
        return res.status(400).send("Stake is not active");
      }
      if (!stake.endDate || new Date(stake.endDate) > new Date()) {
        return res.status(400).send("Stake has not matured yet");
      }

      const updated = await storage.updateStake(stakeId, { status: "withdrawal_pending" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.get("/api/admin/stakes", requireAdmin, async (req, res) => {
    const allStakes = await storage.getAllStakes();
    const users = await storage.getAllUsers();
    
    const stakesWithUsers = allStakes.map((s) => ({
      ...s,
      user: users.find((u) => u.id === s.userId),
    }));
    
    res.json(stakesWithUsers);
  });

  app.patch("/api/admin/stakes/:id", requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      const stakeId = req.params.id;
      
      const updated = await storage.updateStake(stakeId, { status });
      res.json(updated);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.get("/api/admin/settings", requireAdmin, async (req, res) => {
    const settings = await storage.getAllPlatformSettings();
    res.json(settings);
  });

  app.post("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      const { key, value } = req.body;
      const setting = await storage.setPlatformSetting(key, value);
      res.json(setting);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/admin/users/:id/enable-staking", requireAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      const { enabled, conversationId } = req.body;
      
      await storage.updateUser(userId, { stakingEnabled: enabled });
      
      if (conversationId) {
        const message = enabled 
          ? "Your InovaTrust Loop staking access has been enabled! You can now stake USDT/USDC and earn returns."
          : "Your InovaTrust Loop staking access has been disabled.";
        
        await storage.createMessage({
          conversationId,
          senderId: "system",
          senderType: "admin",
          message,
        });

        const room = rooms.get(conversationId);
        if (room) {
          const messages = await storage.getMessagesByConversationId(conversationId);
          const lastMsg = messages[messages.length - 1];
          const broadcast = JSON.stringify({ type: "message", message: lastMsg });
          room.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(broadcast);
            }
          });
        }
      }
      
      res.json({ success: true, enabled });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  return httpServer;
}
