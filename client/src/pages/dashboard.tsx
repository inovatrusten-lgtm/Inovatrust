import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wallet, TrendingUp, ArrowUpRight, PiggyBank, Loader2, CheckCircle2, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/stats-card";
import { TransactionTable } from "@/components/transaction-table";
import { InvestmentCard } from "@/components/investment-card";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import type { Investment, Transaction } from "@shared/schema";

const COUNTRIES = [
  { name: "United States", flag: "🇺🇸", code: "US" },
  { name: "United Kingdom", flag: "🇬🇧", code: "GB" },
  { name: "Germany", flag: "🇩🇪", code: "DE" },
  { name: "France", flag: "🇫🇷", code: "FR" },
  { name: "Canada", flag: "🇨🇦", code: "CA" },
  { name: "Australia", flag: "🇦🇺", code: "AU" },
  { name: "Japan", flag: "🇯🇵", code: "JP" },
  { name: "Singapore", flag: "🇸🇬", code: "SG" },
  { name: "Switzerland", flag: "🇨🇭", code: "CH" },
  { name: "Netherlands", flag: "🇳🇱", code: "NL" },
  { name: "South Korea", flag: "🇰🇷", code: "KR" },
  { name: "Brazil", flag: "🇧🇷", code: "BR" },
  { name: "India", flag: "🇮🇳", code: "IN" },
  { name: "UAE", flag: "🇦🇪", code: "AE" },
  { name: "Nigeria", flag: "🇳🇬", code: "NG" },
  { name: "South Africa", flag: "🇿🇦", code: "ZA" },
  { name: "Mexico", flag: "🇲🇽", code: "MX" },
  { name: "Spain", flag: "🇪🇸", code: "ES" },
  { name: "Italy", flag: "🇮🇹", code: "IT" },
  { name: "Poland", flag: "🇵🇱", code: "PL" },
];

const AMOUNTS = [
  1250, 2500, 3750, 5000, 7500, 10000, 12500, 15000, 
  17500, 20000, 25000, 30000, 35000, 42000, 50000, 75000
];

function generateRandomWithdrawal() {
  const country = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
  const amount = AMOUNTS[Math.floor(Math.random() * AMOUNTS.length)];
  const methods = ["USDT (BEP20)", "USDT (ERC20)", "USDC (BEP20)", "USDC (ERC20)"];
  const method = methods[Math.floor(Math.random() * methods.length)];
  return { country, amount, method, time: "just now" };
}

function LiveWithdrawalsFeed() {
  const [withdrawals, setWithdrawals] = useState(() => [
    { country: COUNTRIES[0], amount: 15000, method: "USDT (BEP20)", time: "2 min ago" },
    { country: COUNTRIES[3], amount: 7500, method: "USDC (ERC20)", time: "5 min ago" },
    { country: COUNTRIES[7], amount: 25000, method: "USDT (ERC20)", time: "8 min ago" },
    { country: COUNTRIES[2], amount: 12500, method: "USDT (BEP20)", time: "12 min ago" },
    { country: COUNTRIES[5], amount: 50000, method: "USDC (BEP20)", time: "15 min ago" },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setWithdrawals(prev => {
        const newWithdrawal = generateRandomWithdrawal();
        const updated = [newWithdrawal, ...prev.slice(0, 4)].map((w, i) => ({
          ...w,
          time: i === 0 ? "just now" : 
                i === 1 ? `${Math.floor(Math.random() * 3 + 1)} min ago` : 
                i === 2 ? `${Math.floor(Math.random() * 5 + 4)} min ago` :
                i === 3 ? `${Math.floor(Math.random() * 5 + 9)} min ago` :
                `${Math.floor(Math.random() * 5 + 14)} min ago`
        }));
        return updated;
      });
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="relative">
              <DollarSign className="h-5 w-5 text-green-500" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-ping" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full" />
            </div>
            Live Withdrawals
          </CardTitle>
          <Badge variant="outline" className="text-green-500 border-green-500/50 bg-green-500/10 text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {withdrawals.map((withdrawal, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-3 rounded-lg transition-all duration-500 ${
                index === 0 ? "bg-green-500/10 border border-green-500/30" : "bg-muted/30"
              }`}
              data-testid={`withdrawal-feed-${index}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl" role="img" aria-label={withdrawal.country.name}>
                  {withdrawal.country.flag}
                </span>
                <div>
                  <p className="font-medium text-sm">{withdrawal.country.name}</p>
                  <p className="text-xs text-muted-foreground">{withdrawal.method}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-green-500">
                  ${withdrawal.amount.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">{withdrawal.time}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-muted-foreground/10 text-center">
          <p className="text-xs text-muted-foreground">
            Withdrawals are processed within 24 hours
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: investments, isLoading: investmentsLoading } = useQuery<Investment[]>({
    queryKey: ["/api/investments"],
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const balance = user?.balance ? parseFloat(user.balance) : 0;
  const totalInvested = user?.totalInvested ? parseFloat(user.totalInvested) : 0;
  const totalEarnings = user?.totalEarnings ? parseFloat(user.totalEarnings) : 0;
  const activeInvestments = investments?.filter((i) => i.status === "active") || [];

  const formatCurrency = (value: number) => {
    return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
  };

  if (investmentsLoading || transactionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.fullName}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/investments">
            <Button data-testid="button-new-investment">
              <TrendingUp className="h-4 w-4 mr-2" />
              New Investment
            </Button>
          </Link>
          <Link href="/withdrawal">
            <Button variant="outline" data-testid="button-withdraw">
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Withdraw
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Available Balance"
          value={formatCurrency(balance)}
          change="+12.5% from last month"
          changeType="positive"
          icon={Wallet}
        />
        <StatsCard
          title="Total Invested"
          value={formatCurrency(totalInvested)}
          change={`${activeInvestments.length} active investments`}
          changeType="neutral"
          icon={PiggyBank}
        />
        <StatsCard
          title="Total Earnings"
          value={formatCurrency(totalEarnings)}
          change="+8.2% this week"
          changeType="positive"
          icon={TrendingUp}
        />
        <StatsCard
          title="Active Investments"
          value={activeInvestments.length.toString()}
          change="Currently running"
          changeType="neutral"
          icon={ArrowUpRight}
        />
      </div>

      {activeInvestments.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Active Investments</h2>
            <Link href="/investments">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeInvestments.slice(0, 3).map((investment) => (
              <InvestmentCard key={investment.id} investment={investment} />
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TransactionTable transactions={transactions || []} />
        </div>
        <div>
          <LiveWithdrawalsFeed />
        </div>
      </div>
    </div>
  );
}
