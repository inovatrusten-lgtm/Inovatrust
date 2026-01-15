import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ArrowDownToLine, Loader2, Wallet, Bitcoin, CreditCard, MessageSquare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { WithdrawalNotice } from "@/components/withdrawal-notice";
import { ChatWidget } from "@/components/chat-widget";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Withdrawal } from "@shared/schema";

const withdrawalSchema = z.object({
  amount: z.string().min(1, "Amount is required"),
  method: z.string().min(1, "Payment method is required"),
  walletAddress: z.string().min(1, "Wallet address is required"),
});

type WithdrawalForm = z.infer<typeof withdrawalSchema>;

const paymentMethods = [
  { id: "usdt_bep20", name: "USDT (BEP20)", icon: Wallet },
  { id: "bitcoin", name: "Bitcoin (BTC)", icon: Bitcoin },
  { id: "ethereum", name: "Ethereum (ETH)", icon: Wallet },
  { id: "usdt_trc20", name: "USDT (TRC20)", icon: CreditCard },
  { id: "bank", name: "Bank Transfer", icon: CreditCard },
];

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

export default function WithdrawalPage() {
  const [chatOpen, setChatOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: withdrawals, isLoading } = useQuery<Withdrawal[]>({
    queryKey: ["/api/withdrawals"],
  });

  const form = useForm<WithdrawalForm>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: { amount: "", method: "", walletAddress: "" },
  });

  const createWithdrawal = useMutation({
    mutationFn: async (data: WithdrawalForm) => {
      const res = await apiRequest("POST", "/api/withdrawals", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Withdrawal Request Submitted",
        description: "Please wait while an admin reviews your request. You will be connected to admin chat.",
      });
      form.reset();
      if (data.conversationId) {
        setActiveConversationId(data.conversationId);
        setChatOpen(true);
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (data: WithdrawalForm) => {
    const amount = parseFloat(data.amount);
    const balance = user?.balance ? parseFloat(user.balance) : 0;

    if (amount < 5) {
      toast({ title: "Error", description: "Minimum withdrawal amount is $5", variant: "destructive" });
      return;
    }

    if (amount > balance) {
      toast({ title: "Error", description: "Insufficient balance", variant: "destructive" });
      return;
    }

    createWithdrawal.mutate(data);
  };

  const openChat = (conversationId: string) => {
    setActiveConversationId(conversationId);
    setChatOpen(true);
  };

  const balance = user?.balance ? parseFloat(user.balance) : 0;
  const pendingWithdrawals = withdrawals?.filter((w) => w.status === "pending") || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Withdrawal</h1>
        <p className="text-muted-foreground">Request a withdrawal from your account</p>
      </div>

      <WithdrawalNotice />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5" />
              Request Withdrawal
            </CardTitle>
            <CardDescription>
              Enter the details for your withdrawal request
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-2xl font-bold text-primary">
                ${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (USD)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Minimum: $5"
                          {...field}
                          data-testid="input-withdrawal-amount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-payment-method">
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {paymentMethods.map((method) => (
                            <SelectItem key={method.id} value={method.id}>
                              <div className="flex items-center gap-2">
                                <method.icon className="h-4 w-4" />
                                {method.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="walletAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wallet / Account Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your wallet or account address"
                          {...field}
                          data-testid="input-wallet-address"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createWithdrawal.isPending}
                  data-testid="button-submit-withdrawal"
                >
                  {createWithdrawal.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ArrowDownToLine className="h-4 w-4 mr-2" />
                  )}
                  Submit Withdrawal Request
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Requests</CardTitle>
            <CardDescription>
              Your withdrawal requests awaiting admin approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingWithdrawals.length === 0 ? (
              <div className="text-center py-8">
                <Wallet className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">No pending withdrawal requests</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingWithdrawals.map((withdrawal) => (
                  <div
                    key={withdrawal.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                    data-testid={`withdrawal-pending-${withdrawal.id}`}
                  >
                    <div>
                      <p className="font-semibold">
                        ${parseFloat(withdrawal.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm text-muted-foreground capitalize">{withdrawal.method}</p>
                      <p className="text-xs text-muted-foreground">
                        {withdrawal.createdAt ? format(new Date(withdrawal.createdAt), "MMM dd, yyyy HH:mm") : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={statusColors[withdrawal.status]}>
                        {withdrawal.status}
                      </Badge>
                      {withdrawal.conversationId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openChat(withdrawal.conversationId!)}
                          data-testid={`button-chat-withdrawal-${withdrawal.id}`}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Chat
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : withdrawals && withdrawals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Withdrawal History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.map((withdrawal) => (
                  <TableRow key={withdrawal.id} data-testid={`row-withdrawal-${withdrawal.id}`}>
                    <TableCell>
                      {withdrawal.createdAt ? format(new Date(withdrawal.createdAt), "MMM dd, yyyy") : "-"}
                    </TableCell>
                    <TableCell className="font-semibold">
                      ${parseFloat(withdrawal.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="capitalize">{withdrawal.method}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusColors[withdrawal.status]}>
                        {withdrawal.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {withdrawal.conversationId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openChat(withdrawal.conversationId!)}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {chatOpen && activeConversationId && (
        <ChatWidget
          isExpanded={true}
          onToggle={() => setChatOpen(false)}
          conversationId={activeConversationId}
        />
      )}
    </div>
  );
}
