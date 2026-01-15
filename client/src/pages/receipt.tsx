import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { format } from "date-fns";
import { Loader2, Wallet, Hash, ArrowLeftRight, DollarSign, Share2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Withdrawal } from "@shared/schema";

export default function ReceiptPage() {
  const params = useParams<{ id: string }>();
  
  const { data: withdrawal, isLoading, error } = useQuery<Withdrawal>({
    queryKey: ["/api/withdrawals", params.id],
    enabled: !!params.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !withdrawal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-2xl font-bold mb-2">Receipt Not Found</h1>
        <p className="text-muted-foreground mb-4">This withdrawal receipt could not be found.</p>
        <Link href="/withdrawal">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Withdrawals
          </Button>
        </Link>
      </div>
    );
  }

  const getCurrency = (method: string) => {
    if (method === "usdt_bep20" || method === "usdt_trc20") return "USDT";
    if (method === "bitcoin") return "BTC";
    if (method === "ethereum") return "ETH";
    return "USD";
  };

  const getNetwork = (method: string) => {
    if (method === "usdt_bep20") return "BinanceSmartChain";
    if (method === "usdt_trc20") return "Tron";
    if (method === "bitcoin") return "Bitcoin";
    if (method === "ethereum") return "Ethereum";
    return "Bank Network";
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <Link href="/withdrawal">
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </Link>

      <div className="bg-[#0a0a0a] border border-[#262626] rounded-lg p-6 space-y-6">
        <div className="text-muted-foreground text-lg font-medium">
          {withdrawal.processedAt 
            ? format(new Date(withdrawal.processedAt), "EEEE, MMMM d")
            : format(new Date(withdrawal.createdAt || new Date()), "EEEE, MMMM d")
          }
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-md bg-red-600/20 border border-red-600/50 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <div className="font-semibold text-white text-lg">Withdrawal</div>
              <div className="text-sm text-muted-foreground">
                {withdrawal.processedAt 
                  ? format(new Date(withdrawal.processedAt), "h:mm a · MMM d, yyyy")
                  : withdrawal.createdAt
                    ? format(new Date(withdrawal.createdAt), "h:mm a · MMM d, yyyy")
                    : "-"
                }
              </div>
            </div>
          </div>
          <div className="text-2xl font-bold text-red-500">
            -${parseFloat(withdrawal.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
        </div>

        <Separator className="bg-[#262626]" />

        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="text-sm text-red-500">Code</div>
              <div className="text-white font-mono">{withdrawal.invoiceNumber || withdrawal.id.slice(0, 20)}</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <ArrowLeftRight className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="text-sm text-red-500">Origin</div>
              <div className="text-white">Earnings</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Wallet className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-red-500">Wallet</div>
              <div className="text-white font-mono text-sm break-all">{withdrawal.walletAddress}</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="text-sm text-red-500">Currency</div>
              <div className="text-white">{getCurrency(withdrawal.method)}</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Share2 className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="text-sm text-red-500">Network</div>
              <div className="text-white">{getNetwork(withdrawal.method)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
