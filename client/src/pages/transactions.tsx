import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { TransactionTable } from "@/components/transaction-table";
import type { Transaction } from "@shared/schema";

export default function TransactionsPage() {
  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Transactions</h1>
        <p className="text-muted-foreground">View your complete transaction history</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <TransactionTable
          transactions={transactions || []}
          title="All Transactions"
          showAll
        />
      )}
    </div>
  );
}
