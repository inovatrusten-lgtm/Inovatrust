import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Transaction } from "@shared/schema";
import { ArrowDownLeft, ArrowUpRight, RefreshCw, Wallet } from "lucide-react";

interface TransactionTableProps {
  transactions: Transaction[];
  title?: string;
  showAll?: boolean;
}

const typeIcons: Record<string, typeof ArrowDownLeft> = {
  deposit: ArrowDownLeft,
  withdrawal: ArrowUpRight,
  investment: RefreshCw,
  earnings: Wallet,
};

const statusColors: Record<string, string> = {
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

export function TransactionTable({ transactions, title = "Recent Transactions", showAll = false }: TransactionTableProps) {
  const displayTransactions = showAll ? transactions : transactions.slice(0, 10);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {displayTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <RefreshCw className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No transactions yet</p>
            <p className="text-sm text-muted-foreground/70">Your transaction history will appear here</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayTransactions.map((transaction) => {
                const Icon = typeIcons[transaction.type] || RefreshCw;
                return (
                  <TableRow key={transaction.id} data-testid={`row-transaction-${transaction.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="capitalize font-medium">{transaction.type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {transaction.description || "-"}
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums">
                      <span className={transaction.type === "withdrawal" ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}>
                        {transaction.type === "withdrawal" ? "-" : "+"}${parseFloat(transaction.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusColors[transaction.status] || ""}>
                        {transaction.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {transaction.createdAt ? format(new Date(transaction.createdAt), "MMM dd, yyyy") : "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
