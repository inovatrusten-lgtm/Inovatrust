import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Investment } from "@shared/schema";
import { TrendingUp, Calendar, Percent } from "lucide-react";

interface InvestmentCardProps {
  investment: Investment;
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export function InvestmentCard({ investment }: InvestmentCardProps) {
  const startDate = investment.startDate ? new Date(investment.startDate) : new Date();
  const endDate = investment.endDate ? new Date(investment.endDate) : null;
  const now = new Date();
  
  let progress = 0;
  if (endDate) {
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsed = now.getTime() - startDate.getTime();
    progress = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
  }

  return (
    <Card className="hover-elevate" data-testid={`card-investment-${investment.id}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <CardTitle className="text-lg font-semibold">{investment.packageName}</CardTitle>
        <Badge variant="secondary" className={statusColors[investment.status] || ""}>
          {investment.status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span className="text-xs">Amount</span>
            </div>
            <p className="text-lg font-bold tabular-nums">
              ${parseFloat(investment.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Percent className="h-3 w-3" />
              <span className="text-xs">Daily Return</span>
            </div>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              {investment.dailyReturn}%
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span className="text-xs">Duration</span>
            </div>
            <p className="text-lg font-bold">{investment.duration}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Started: {format(startDate, "MMM dd, yyyy")}</span>
          {endDate && <span>Ends: {format(endDate, "MMM dd, yyyy")}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
