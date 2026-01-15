import { AlertTriangle, Clock, MessageSquare, Shield } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

export function WithdrawalNotice() {
  return (
    <div className="space-y-4">
      <Alert className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/20">
        <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
        <AlertTitle className="text-yellow-800 dark:text-yellow-200">Important Withdrawal Notice</AlertTitle>
        <AlertDescription className="text-yellow-700 dark:text-yellow-300">
          All withdrawal requests require admin approval. Please read the following information carefully before proceeding.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="grid gap-4 p-6 md:grid-cols-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold">Processing Time</h4>
              <p className="text-sm text-muted-foreground">
                Withdrawals are processed within 24-48 business hours after admin approval
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold">Admin Verification</h4>
              <p className="text-sm text-muted-foreground">
                You may be contacted via chat to verify your identity and withdrawal details
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold">Security First</h4>
              <p className="text-sm text-muted-foreground">
                For your protection, large withdrawals may require additional verification steps
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
