import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ethers } from "ethers";
import { Wallet, Link2, Clock, TrendingUp, CheckCircle2, Loader2, AlertCircle, Coins, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import type { Stake } from "@shared/schema";

const USDT_CONTRACTS = {
  bep20: "0x55d398326f99059fF775485246999027B3197955",
  erc20: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
};

const USDC_CONTRACTS = {
  bep20: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
  erc20: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
};

const NETWORKS = {
  bep20: { chainId: 56, name: "BNB Smart Chain", rpcUrl: "https://bsc-dataseed.binance.org/" },
  erc20: { chainId: 1, name: "Ethereum Mainnet", rpcUrl: "https://eth.llamarpc.com" },
};

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

interface StakingPlan {
  periodDays: string;
  roiPercent: string;
  label: string;
}

interface StakingStatus {
  stakingEnabled: boolean;
  connectedWallet: string | null;
}

interface ReceivingAddresses {
  bep20: string | null;
  erc20: string | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function StakingPage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"usdt" | "usdc">("usdt");
  const [network, setNetwork] = useState<"bep20" | "erc20">("bep20");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const { data: stakingStatus } = useQuery<StakingStatus>({
    queryKey: ["/api/staking/status"],
  });

  const { data: plans } = useQuery<StakingPlan[]>({
    queryKey: ["/api/staking/plans"],
  });

  const { data: stakes, isLoading: stakesLoading } = useQuery<Stake[]>({
    queryKey: ["/api/stakes"],
  });

  const { data: receivingAddresses } = useQuery<ReceivingAddresses>({
    queryKey: ["/api/staking/receiving-addresses"],
  });

  const connectWalletMutation = useMutation({
    mutationFn: async (address: string) => {
      return apiRequest("POST", "/api/staking/connect-wallet", { walletAddress: address });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staking/status"] });
    },
  });

  const createStakeMutation = useMutation({
    mutationFn: async (data: {
      amount: string;
      currency: string;
      network: string;
      periodDays: string;
      walletAddress: string;
      txHash: string;
    }) => {
      return apiRequest("POST", "/api/stakes", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stakes"] });
      setAmount("");
      setSelectedPlan("");
      toast({
        title: "Stake Created",
        description: "Your stake has been successfully created and is now active.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create stake",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (stakingStatus?.connectedWallet) {
      setWalletAddress(stakingStatus.connectedWallet);
    }
  }, [stakingStatus]);

  const connectWallet = async () => {
    if (typeof window.ethereum === "undefined") {
      toast({
        title: "Wallet Not Found",
        description: "Please install MetaMask or another Web3 wallet to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      
      if (accounts.length > 0) {
        const address = accounts[0];
        setWalletAddress(address);
        await connectWalletMutation.mutateAsync(address);
        toast({
          title: "Wallet Connected",
          description: `Connected: ${address.slice(0, 6)}...${address.slice(-4)}`,
        });
      }
    } catch (error: any) {
      console.error("Wallet connection error:", error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const switchNetwork = async (targetNetwork: "bep20" | "erc20") => {
    if (!window.ethereum) return;

    const networkConfig = NETWORKS[targetNetwork];
    const chainIdHex = `0x${networkConfig.chainId.toString(16)}`;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdHex }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902 && targetNetwork === "bep20") {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: chainIdHex,
            chainName: "BNB Smart Chain",
            nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
            rpcUrls: ["https://bsc-dataseed.binance.org/"],
            blockExplorerUrls: ["https://bscscan.com/"],
          }],
        });
      }
    }
  };

  const executeStake = async () => {
    if (!walletAddress || !selectedPlan || !amount) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields before staking.",
        variant: "destructive",
      });
      return;
    }

    const receivingAddress = receivingAddresses?.[network];
    if (!receivingAddress) {
      toast({
        title: "Configuration Error",
        description: "Receiving address not configured. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      await switchNetwork(network);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const contractAddress = currency === "usdt" 
        ? USDT_CONTRACTS[network] 
        : USDC_CONTRACTS[network];

      const tokenContract = new ethers.Contract(contractAddress, ERC20_ABI, signer);
      const decimals = await tokenContract.decimals();
      const amountInWei = ethers.parseUnits(amount, decimals);

      const tx = await tokenContract.transfer(receivingAddress, amountInWei);
      
      toast({
        title: "Transaction Submitted",
        description: "Please wait for confirmation...",
      });

      await tx.wait();

      await createStakeMutation.mutateAsync({
        amount,
        currency: currency.toUpperCase(),
        network: network.toUpperCase(),
        periodDays: selectedPlan,
        walletAddress,
        txHash: tx.hash,
      });

    } catch (error: any) {
      console.error("Stake error:", error);
      toast({
        title: "Transaction Failed",
        description: error.reason || error.message || "Failed to process transaction",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedPlanData = plans?.find(p => p.periodDays === selectedPlan);
  const expectedReturn = selectedPlanData && amount 
    ? (parseFloat(amount) * (1 + parseFloat(selectedPlanData.roiPercent) / 100)).toFixed(2)
    : "0.00";

  if (!stakingStatus?.stakingEnabled) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-4 py-12">
          <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Coins className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">InovaTrust Loop</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            High-yield staking for USDT and USDC on BEP20 and ERC20 networks. 
            Earn up to 120% ROI with flexible lock periods.
          </p>
        </div>

        <Card className="border-primary/20">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle>Staking Access Required</CardTitle>
            <CardDescription>
              Your account needs to be enabled for staking. Please contact our support team 
              through the chat feature to request access.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <a href="/chat" data-testid="link-chat-support">
                Contact Support
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Coins className="h-8 w-8 text-primary" />
            InovaTrust Loop
          </h1>
          <p className="text-muted-foreground mt-1">
            Stake USDT/USDC and earn high-yield returns
          </p>
        </div>
        
        {walletAddress ? (
          <Badge variant="outline" className="py-2 px-4 text-sm border-green-500/50 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </Badge>
        ) : (
          <Button 
            onClick={connectWallet} 
            disabled={isConnecting}
            className="gap-2"
            data-testid="button-connect-wallet"
          >
            {isConnecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wallet className="h-4 w-4" />
            )}
            Connect Wallet
          </Button>
        )}
      </div>

      <Tabs defaultValue="stake" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="stake" data-testid="tab-stake">New Stake</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">My Stakes</TabsTrigger>
        </TabsList>

        <TabsContent value="stake" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            {plans?.map((plan) => (
              <Card 
                key={plan.periodDays}
                className={`cursor-pointer transition-all hover-elevate ${
                  selectedPlan === plan.periodDays 
                    ? "border-primary ring-2 ring-primary/20" 
                    : "border-border"
                }`}
                onClick={() => setSelectedPlan(plan.periodDays)}
                data-testid={`card-plan-${plan.periodDays}`}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary mb-1">
                    {plan.roiPercent}%
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <Clock className="h-3 w-3" />
                    {plan.label}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {walletAddress ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Create Stake
                </CardTitle>
                <CardDescription>
                  Select your staking parameters and confirm the transaction
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Currency</label>
                    <Select value={currency} onValueChange={(v) => setCurrency(v as "usdt" | "usdc")}>
                      <SelectTrigger data-testid="select-currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="usdt">USDT (Tether)</SelectItem>
                        <SelectItem value="usdc">USDC (Circle)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Network</label>
                    <Select value={network} onValueChange={(v) => setNetwork(v as "bep20" | "erc20")}>
                      <SelectTrigger data-testid="select-network">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bep20">BEP20 (BNB Chain)</SelectItem>
                        <SelectItem value="erc20">ERC20 (Ethereum)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount ({currency.toUpperCase()})</label>
                  <Input
                    type="number"
                    placeholder="Enter amount to stake"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    data-testid="input-amount"
                  />
                </div>

                {selectedPlanData && amount && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-muted-foreground">Expected Return</div>
                          <div className="text-2xl font-bold text-accent">
                            {expectedReturn} {currency.toUpperCase()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Lock Period</div>
                          <div className="text-lg font-semibold">{selectedPlanData.label}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">ROI</div>
                          <div className="text-lg font-semibold text-primary">
                            +{selectedPlanData.roiPercent}%
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Button
                  className="w-full gap-2"
                  size="lg"
                  onClick={executeStake}
                  disabled={!selectedPlan || !amount || isProcessing}
                  data-testid="button-stake"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Stake Now
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Link2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
                <p className="text-muted-foreground mb-4">
                  Connect your wallet to start staking USDT or USDC
                </p>
                <Button onClick={connectWallet} disabled={isConnecting} data-testid="button-connect-wallet-cta">
                  {isConnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Wallet className="h-4 w-4 mr-2" />
                  )}
                  Connect Wallet
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>My Stakes</CardTitle>
              <CardDescription>View your staking history and active stakes</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {stakesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : stakes && stakes.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>ROI</TableHead>
                      <TableHead>Expected Return</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stakes.map((stake) => (
                      <TableRow key={stake.id} data-testid={`row-stake-${stake.id}`}>
                        <TableCell>
                          {stake.createdAt ? format(new Date(stake.createdAt), "MMM dd, yyyy") : "-"}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {parseFloat(stake.amount).toLocaleString()} {stake.currency}
                        </TableCell>
                        <TableCell>{stake.periodDays} days</TableCell>
                        <TableCell className="text-primary font-medium">
                          +{stake.roiPercent}%
                        </TableCell>
                        <TableCell className="text-accent font-semibold">
                          {parseFloat(stake.expectedReturn).toLocaleString()} {stake.currency}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={statusColors[stake.status]}>
                            {stake.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No stakes yet. Create your first stake to start earning.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

declare global {
  interface Window {
    ethereum?: any;
  }
}
