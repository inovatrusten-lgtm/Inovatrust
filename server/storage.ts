import {
  users,
  investments,
  transactions,
  withdrawals,
  chatMessages,
  conversations,
  stakes,
  platformSettings,
  type User,
  type InsertUser,
  type Investment,
  type InsertInvestment,
  type Transaction,
  type InsertTransaction,
  type Withdrawal,
  type InsertWithdrawal,
  type ChatMessage,
  type InsertChatMessage,
  type Conversation,
  type InsertConversation,
  type Stake,
  type InsertStake,
  type PlatformSetting,
  type InsertPlatformSetting,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;

  getInvestmentsByUserId(userId: string): Promise<Investment[]>;
  createInvestment(investment: InsertInvestment): Promise<Investment>;

  getTransactionsByUserId(userId: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;

  getWithdrawalsByUserId(userId: string): Promise<Withdrawal[]>;
  getAllWithdrawals(): Promise<Withdrawal[]>;
  createWithdrawal(withdrawal: InsertWithdrawal & { conversationId?: string }): Promise<Withdrawal>;
  updateWithdrawal(id: string, data: Partial<Withdrawal>): Promise<Withdrawal | undefined>;

  getConversationsByUserId(userId: string): Promise<Conversation[]>;
  getAllConversations(): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, data: Partial<Conversation>): Promise<Conversation | undefined>;

  getMessagesByConversationId(conversationId: string): Promise<ChatMessage[]>;
  createMessage(message: InsertChatMessage): Promise<ChatMessage>;

  getStake(id: string): Promise<Stake | undefined>;
  getStakesByUserId(userId: string): Promise<Stake[]>;
  getAllStakes(): Promise<Stake[]>;
  createStake(stake: InsertStake): Promise<Stake>;
  updateStake(id: string, data: Partial<Stake>): Promise<Stake | undefined>;

  getPlatformSetting(key: string): Promise<PlatformSetting | undefined>;
  setPlatformSetting(key: string, value: string): Promise<PlatformSetting>;
  getAllPlatformSettings(): Promise<PlatformSetting[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      ...insertUser,
      balance: "0.00",
      totalInvested: "0.00",
      totalEarnings: "0.00",
      isAdmin: false,
    }).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async getInvestmentsByUserId(userId: string): Promise<Investment[]> {
    return db.select().from(investments).where(eq(investments.userId, userId)).orderBy(desc(investments.startDate));
  }

  async createInvestment(investment: InsertInvestment): Promise<Investment> {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    
    const [inv] = await db.insert(investments).values({
      ...investment,
      status: "active",
      endDate,
    }).returning();
    return inv;
  }

  async getTransactionsByUserId(userId: string): Promise<Transaction[]> {
    return db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.createdAt));
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [tx] = await db.insert(transactions).values({
      ...transaction,
      status: "completed",
    }).returning();
    return tx;
  }

  async getWithdrawalsByUserId(userId: string): Promise<Withdrawal[]> {
    return db.select().from(withdrawals).where(eq(withdrawals.userId, userId)).orderBy(desc(withdrawals.createdAt));
  }

  async getAllWithdrawals(): Promise<Withdrawal[]> {
    return db.select().from(withdrawals).orderBy(desc(withdrawals.createdAt));
  }

  async createWithdrawal(withdrawal: InsertWithdrawal & { conversationId?: string }): Promise<Withdrawal> {
    const [w] = await db.insert(withdrawals).values({
      ...withdrawal,
      status: "pending",
    }).returning();
    return w;
  }

  async updateWithdrawal(id: string, data: Partial<Withdrawal>): Promise<Withdrawal | undefined> {
    const [w] = await db.update(withdrawals).set(data).where(eq(withdrawals.id, id)).returning();
    return w || undefined;
  }

  async getConversationsByUserId(userId: string): Promise<Conversation[]> {
    return db.select().from(conversations).where(eq(conversations.userId, userId)).orderBy(desc(conversations.updatedAt));
  }

  async getAllConversations(): Promise<Conversation[]> {
    return db.select().from(conversations).orderBy(desc(conversations.updatedAt));
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conv || undefined;
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [conv] = await db.insert(conversations).values({
      ...conversation,
      status: "open",
    }).returning();
    return conv;
  }

  async updateConversation(id: string, data: Partial<Conversation>): Promise<Conversation | undefined> {
    const [conv] = await db.update(conversations).set(data).where(eq(conversations.id, id)).returning();
    return conv || undefined;
  }

  async getMessagesByConversationId(conversationId: string): Promise<ChatMessage[]> {
    return db.select().from(chatMessages).where(eq(chatMessages.conversationId, conversationId)).orderBy(chatMessages.createdAt);
  }

  async createMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [msg] = await db.insert(chatMessages).values(message).returning();
    
    await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, message.conversationId));
    
    return msg;
  }

  async getStake(id: string): Promise<Stake | undefined> {
    const [stake] = await db.select().from(stakes).where(eq(stakes.id, id));
    return stake || undefined;
  }

  async getStakesByUserId(userId: string): Promise<Stake[]> {
    return db.select().from(stakes).where(eq(stakes.userId, userId)).orderBy(desc(stakes.createdAt));
  }

  async getAllStakes(): Promise<Stake[]> {
    return db.select().from(stakes).orderBy(desc(stakes.createdAt));
  }

  async createStake(stake: InsertStake): Promise<Stake> {
    const [s] = await db.insert(stakes).values({
      ...stake,
      status: "pending",
    }).returning();
    return s;
  }

  async updateStake(id: string, data: Partial<Stake>): Promise<Stake | undefined> {
    const [s] = await db.update(stakes).set(data).where(eq(stakes.id, id)).returning();
    return s || undefined;
  }

  async getPlatformSetting(key: string): Promise<PlatformSetting | undefined> {
    const [setting] = await db.select().from(platformSettings).where(eq(platformSettings.key, key));
    return setting || undefined;
  }

  async setPlatformSetting(key: string, value: string): Promise<PlatformSetting> {
    const existing = await this.getPlatformSetting(key);
    if (existing) {
      const [updated] = await db.update(platformSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(platformSettings.key, key))
        .returning();
      return updated;
    }
    const [created] = await db.insert(platformSettings).values({ key, value }).returning();
    return created;
  }

  async getAllPlatformSettings(): Promise<PlatformSetting[]> {
    return db.select().from(platformSettings);
  }
}

export const storage = new DatabaseStorage();
