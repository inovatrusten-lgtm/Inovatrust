import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TrendingUp, Loader2, Plus, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { InvestmentCard } from "@/components/investment-card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Investment } from "@shared/schema";

const packages = [
  { name: "Starter", minAmount: 100, maxAmount: 999, dailyReturn: "2.5", duration: "30 days" },
  { name: "Growth", minAmount: 1000, maxAmount: 4999, dailyReturn: "3.0", duration: "30 days" },
  { name: "Premium", minAmount: 5000, maxAmount: 19999, dailyReturn: "3.5", duration: "30 days" },
  { name: "Elite", minAmount: 20000, maxAmount: 100000, dailyReturn: "4.0", duration: "30 days" },
];

const investmentSchema = z.object({
  amount: z.string().min(1, "Amount is required"),
});

type InvestmentForm = z.infer<typeof investmentSchema>;

export default function InvestmentsPage() {
  const [selectedPackage, setSelectedPackage] = useState<typeof packages[0] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: investments, isLoading } = useQuery<Investment[]>({
    queryKey: ["/api/investments"],
  });

  const form = useForm<InvestmentForm>({
    resolver: zodResolver(investmentSchema),
    defaultValues: { amount: "" },
  });

  const createInvestment = useMutation({
    mutationFn: async (data: { packageName: string; amount: string; dailyReturn: string; duration: string }) => {
      const res = await apiRequest("POST", "/api/investments", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Investment Created", description: "Your investment has been successfully created." });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleInvest = (data: InvestmentForm) => {
    if (!selectedPackage) return;
    
    const amount = parseFloat(data.amount);
    if (amount < selectedPackage.minAmount || amount > selectedPackage.maxAmount) {
      toast({
        title: "Invalid Amount",
        description: `Amount must be between $${selectedPackage.minAmount} and $${selectedPackage.maxAmount}`,
        variant: "destructive",
      });
      return;
    }

    createInvestment.mutate({
      packageName: selectedPackage.name,
      amount: data.amount,
      dailyReturn: selectedPackage.dailyReturn,
      duration: selectedPackage.duration,
    });
  };

  const activeInvestments = investments?.filter((i) => i.status === "active") || [];
  const completedInvestments = investments?.filter((i) => i.status === "completed") || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Investments</h1>
          <p className="text-muted-foreground">Manage your investment portfolio</p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Investment Packages</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {packages.map((pkg) => (
            <Card key={pkg.name} className="hover-elevate cursor-pointer" data-testid={`card-package-${pkg.name.toLowerCase()}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{pkg.name}</CardTitle>
                <CardDescription>
                  ${pkg.minAmount.toLocaleString()} - ${pkg.maxAmount.toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Daily Return</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">{pkg.dailyReturn}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-medium">{pkg.duration}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Return</span>
                    <span className="font-semibold text-primary">{(parseFloat(pkg.dailyReturn) * 30).toFixed(0)}%</span>
                  </div>
                </div>
                <Dialog open={dialogOpen && selectedPackage?.name === pkg.name} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      className="w-full"
                      onClick={() => setSelectedPackage(pkg)}
                      data-testid={`button-invest-${pkg.name.toLowerCase()}`}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Invest Now
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invest in {pkg.name} Package</DialogTitle>
                      <DialogDescription>
                        Enter the amount you want to invest (${pkg.minAmount} - ${pkg.maxAmount})
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(handleInvest)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Investment Amount (USD)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder={`Min: $${pkg.minAmount}`}
                                  {...field}
                                  data-testid="input-investment-amount"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="bg-muted p-4 rounded-lg space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Daily Earnings</span>
                            <span className="font-medium">
                              {form.watch("amount") ? `$${(parseFloat(form.watch("amount") || "0") * parseFloat(pkg.dailyReturn) / 100).toFixed(2)}` : "-"}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Total Return (30 days)</span>
                            <span className="font-semibold text-green-600 dark:text-green-400">
                              {form.watch("amount") ? `$${(parseFloat(form.watch("amount") || "0") * parseFloat(pkg.dailyReturn) * 30 / 100).toFixed(2)}` : "-"}
                            </span>
                          </div>
                        </div>
                        <Button type="submit" className="w-full" disabled={createInvestment.isPending} data-testid="button-confirm-investment">
                          {createInvestment.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                          Confirm Investment
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {activeInvestments.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Active Investments ({activeInvestments.length})</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeInvestments.map((investment) => (
                  <InvestmentCard key={investment.id} investment={investment} />
                ))}
              </div>
            </div>
          )}

          {completedInvestments.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Completed Investments ({completedInvestments.length})</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {completedInvestments.map((investment) => (
                  <InvestmentCard key={investment.id} investment={investment} />
                ))}
              </div>
            </div>
          )}

          {investments?.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Investments Yet</h3>
                <p className="text-muted-foreground text-center max-w-sm">
                  Start your investment journey by choosing one of our packages above.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
