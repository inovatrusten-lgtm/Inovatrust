import { useQuery } from "@tanstack/react-query";
import { Wallet, TrendingUp, ArrowUpRight, PiggyBank, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/stats-card";
import { TransactionTable } from "@/components/transaction-table";
import { InvestmentCard } from "@/components/investment-card";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import type { Investment, Transaction } from "@shared/schema";

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

      <TransactionTable transactions={transactions || []} />
    </div>
  );
}
