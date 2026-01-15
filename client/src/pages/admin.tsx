import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Send, Loader2, MessageSquare, Check, X, Users, ArrowDownToLine, Clock, Edit2, DollarSign, Save, Coins, Settings, Wallet, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Withdrawal, Conversation, ChatMessage, User, Stake, PlatformSetting } from "@shared/schema";
import { Switch } from "@/components/ui/switch";

interface WithdrawalWithUser extends Withdrawal {
  user?: User;
}

interface ConversationWithUser extends Conversation {
  user?: User;
}

interface StakeWithUser extends Stake {
  user?: User;
}

export default function AdminPage() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editBalance, setEditBalance] = useState("");
  const [editTotalInvested, setEditTotalInvested] = useState("");
  const [editTotalEarnings, setEditTotalEarnings] = useState("");
  const [bep20Address, setBep20Address] = useState("");
  const [erc20Address, setErc20Address] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const { data: withdrawals, isLoading: withdrawalsLoading } = useQuery<WithdrawalWithUser[]>({
    queryKey: ["/api/admin/withdrawals"],
    enabled: isAdmin,
  });

  const { data: conversations, isLoading: conversationsLoading } = useQuery<ConversationWithUser[]>({
    queryKey: ["/api/admin/conversations"],
    enabled: isAdmin,
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAdmin,
  });

  const { data: stakes, isLoading: stakesLoading } = useQuery<StakeWithUser[]>({
    queryKey: ["/api/admin/stakes"],
    enabled: isAdmin,
  });

  const { data: settings } = useQuery<PlatformSetting[]>({
    queryKey: ["/api/admin/settings"],
    enabled: isAdmin,
  });

  const { data: walletInfo } = useQuery<{ configured: boolean; address: string | null }>({
    queryKey: ["/api/admin/wallet-info"],
    enabled: isAdmin,
  });

  useEffect(() => {
    if (settings) {
      const bep20 = settings.find(s => s.key === "receiving_wallet_bep20");
      const erc20 = settings.find(s => s.key === "receiving_wallet_erc20");
      if (bep20) setBep20Address(bep20.value);
      if (erc20) setErc20Address(erc20.value);
    }
  }, [settings]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages();
      connectWebSocket();
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    if (!selectedConversation) return;
    try {
      const res = await fetch(`/api/chat/${selectedConversation}/messages`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };

  const connectWebSocket = () => {
    if (!selectedConversation) return;
    
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", conversationId: selectedConversation }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "message") {
        setMessages((prev) => {
          const exists = prev.some(m => m.id === data.message.id);
          if (exists) return prev;
          return [...prev, data.message];
        });
      }
    };

    wsRef.current = ws;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/chat/${selectedConversation}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newMessage }),
        credentials: "include",
      });

      if (res.ok) {
        setNewMessage("");
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateWithdrawal = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/withdrawals/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
      toast({ title: "Withdrawal Updated", description: "The withdrawal status has been updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateUser = useMutation({
    mutationFn: async ({ id, balance, totalInvested, totalEarnings }: { id: string; balance: string; totalInvested: string; totalEarnings: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${id}`, { balance, totalInvested, totalEarnings });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User Updated", description: "User balance has been updated successfully." });
      setEditingUser(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const enableStaking = useMutation({
    mutationFn: async ({ userId, enabled, conversationId }: { userId: string; enabled: boolean; conversationId?: string }) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/enable-staking`, { enabled, conversationId });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ 
        title: variables.enabled ? "Staking Enabled" : "Staking Disabled", 
        description: `User staking access has been ${variables.enabled ? "enabled" : "disabled"}.` 
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const saveSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const res = await apiRequest("POST", "/api/admin/settings", { key, value });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/staking/receiving-addresses"] });
      toast({ title: "Settings Saved", description: "Receiving address has been updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const approveStakeWithdrawal = useMutation({
    mutationFn: async (stakeId: string) => {
      const res = await apiRequest("PATCH", `/api/admin/stakes/${stakeId}`, { status: "completed" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stakes"] });
      toast({ title: "Withdrawal Approved", description: "The stake withdrawal has been approved." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const openEditUser = (u: User) => {
    setEditingUser(u);
    setEditBalance(u.balance || "0.00");
    setEditTotalInvested(u.totalInvested || "0.00");
    setEditTotalEarnings(u.totalEarnings || "0.00");
  };

  const handleSaveUser = () => {
    if (!editingUser) return;
    updateUser.mutate({
      id: editingUser.id,
      balance: editBalance,
      totalInvested: editTotalInvested,
      totalEarnings: editTotalEarnings,
    });
  };

  const pendingWithdrawals = withdrawals?.filter((w) => w.status === "pending") || [];
  const openConversations = conversations?.filter((c) => c.status === "open") || [];

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <X className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don't have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground">Manage withdrawals and user communications</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Withdrawals</p>
                <p className="text-2xl font-bold">{pendingWithdrawals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <MessageSquare className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Open Chats</p>
                <p className="text-2xl font-bold">{openConversations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{users?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="withdrawals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="withdrawals" data-testid="tab-withdrawals">
            <ArrowDownToLine className="h-4 w-4 mr-2" />
            Withdrawals
            {pendingWithdrawals.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                {pendingWithdrawals.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="chats" data-testid="tab-chats">
            <MessageSquare className="h-4 w-4 mr-2" />
            User Chats
            {openConversations.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                {openConversations.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="h-4 w-4 mr-2" />
            Manage Users
          </TabsTrigger>
          <TabsTrigger value="staking" data-testid="tab-staking">
            <Coins className="h-4 w-4 mr-2" />
            Staking
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="withdrawals">
          <Card>
            <CardHeader>
              <CardTitle>Withdrawal Requests</CardTitle>
              <CardDescription>Review and process user withdrawal requests</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {withdrawalsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : withdrawals?.length === 0 ? (
                <div className="text-center py-12">
                  <ArrowDownToLine className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">No withdrawal requests</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Wallet</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals?.map((withdrawal) => (
                      <TableRow key={withdrawal.id} data-testid={`withdrawal-row-${withdrawal.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {withdrawal.user?.fullName?.slice(0, 2).toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{withdrawal.user?.fullName || "Unknown"}</p>
                              <p className="text-xs text-muted-foreground">{withdrawal.user?.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          ${parseFloat(withdrawal.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="capitalize">{withdrawal.method}</TableCell>
                        <TableCell className="font-mono text-xs max-w-[150px] truncate">
                          {withdrawal.walletAddress}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn(
                            withdrawal.status === "pending" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
                            withdrawal.status === "approved" && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
                            withdrawal.status === "rejected" && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          )}>
                            {withdrawal.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {withdrawal.createdAt ? format(new Date(withdrawal.createdAt), "MMM dd, HH:mm") : "-"}
                        </TableCell>
                        <TableCell>
                          {withdrawal.status === "pending" && (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => updateWithdrawal.mutate({ id: withdrawal.id, status: "approved" })}
                                disabled={updateWithdrawal.isPending}
                                data-testid={`button-approve-${withdrawal.id}`}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateWithdrawal.mutate({ id: withdrawal.id, status: "rejected" })}
                                disabled={updateWithdrawal.isPending}
                                data-testid={`button-reject-${withdrawal.id}`}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                              {withdrawal.conversationId && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setSelectedConversation(withdrawal.conversationId!)}
                                  data-testid={`button-chat-${withdrawal.id}`}
                                >
                                  <MessageSquare className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chats">
          <div className="grid gap-6 lg:grid-cols-[300px_1fr] h-[500px]">
            <Card className="flex flex-col">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">User Conversations</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-0">
                <ScrollArea className="h-full">
                  {conversationsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : conversations?.length === 0 ? (
                    <div className="text-center py-8 px-4">
                      <MessageSquare className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No conversations</p>
                    </div>
                  ) : (
                    <div className="space-y-1 p-2">
                      {conversations?.map((conv) => (
                        <button
                          key={conv.id}
                          onClick={() => setSelectedConversation(conv.id)}
                          className={cn(
                            "w-full text-left p-3 rounded-lg transition-colors hover-elevate",
                            selectedConversation === conv.id ? "bg-primary/10" : "hover:bg-muted"
                          )}
                          data-testid={`admin-conversation-${conv.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {conv.user?.fullName?.slice(0, 2).toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{conv.user?.fullName || "User"}</p>
                              <p className="text-xs text-muted-foreground">{conv.subject || "Support"}</p>
                            </div>
                            <Badge variant="secondary" className={cn(
                              "text-xs",
                              conv.status === "open" 
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-muted text-muted-foreground"
                            )}>
                              {conv.status}
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="flex flex-col">
              {!selectedConversation ? (
                <CardContent className="flex-1 flex flex-col items-center justify-center">
                  <MessageSquare className="h-16 w-16 text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Select a Conversation</h3>
                  <p className="text-muted-foreground text-center max-w-sm">
                    Choose a user conversation to respond to their messages
                  </p>
                </CardContent>
              ) : (
                <>
                  <CardHeader className="flex flex-row items-center gap-3 border-b py-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {conversations?.find(c => c.id === selectedConversation)?.user?.fullName?.slice(0, 2).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">
                        {conversations?.find(c => c.id === selectedConversation)?.user?.fullName || "User"}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {conversations?.find(c => c.id === selectedConversation)?.user?.email}
                      </p>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 p-0 flex flex-col min-h-0">
                    <ScrollArea className="flex-1 p-4">
                      <div className="space-y-4">
                        {messages.length === 0 ? (
                          <div className="text-center py-12">
                            <p className="text-muted-foreground">No messages yet</p>
                          </div>
                        ) : (
                          messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={cn(
                                "flex gap-3",
                                msg.senderType === "admin" ? "justify-end" : "justify-start"
                              )}
                            >
                              {msg.senderType === "user" && (
                                <Avatar className="h-8 w-8 shrink-0">
                                  <AvatarFallback className="text-xs">U</AvatarFallback>
                                </Avatar>
                              )}
                              <div
                                className={cn(
                                  "max-w-[70%] rounded-lg px-4 py-2",
                                  msg.senderType === "admin"
                                    ? "bg-[hsl(152,69%,40%)] text-white"
                                    : "bg-muted"
                                )}
                              >
                                <p className="text-sm">{msg.message}</p>
                                <p className={cn(
                                  "text-xs mt-1",
                                  msg.senderType === "admin" ? "text-white/70" : "text-muted-foreground"
                                )}>
                                  {msg.createdAt ? format(new Date(msg.createdAt), "HH:mm") : ""}
                                </p>
                              </div>
                              {msg.senderType === "admin" && (
                                <Avatar className="h-8 w-8 shrink-0">
                                  <AvatarFallback className="bg-[hsl(152,69%,40%)] text-white text-xs">AD</AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          ))
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>

                    <div className="p-4 border-t">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSendMessage();
                        }}
                        className="flex gap-2"
                      >
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type your response..."
                          disabled={isLoading}
                          data-testid="input-admin-message"
                        />
                        <Button type="submit" disabled={isLoading || !newMessage.trim()} data-testid="button-admin-send">
                          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                      </form>
                    </div>
                  </CardContent>
                </>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage user balances and account details</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Total Invested</TableHead>
                    <TableHead>Total Earnings</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.filter(u => !u.isAdmin).map((u) => (
                    <TableRow key={u.id} data-testid={`user-row-${u.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {u.fullName?.slice(0, 2).toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{u.fullName}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-primary">
                        ${parseFloat(u.balance || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        ${parseFloat(u.totalInvested || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-green-600">
                        ${parseFloat(u.totalEarnings || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">User</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditUser(u)}
                          data-testid={`button-edit-user-${u.id}`}
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Edit Balance
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {users?.filter(u => !u.isAdmin).length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">No users registered yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staking">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Staking Access</CardTitle>
                <CardDescription>Enable or disable staking for users. When enabled, users can access InovaTrust Loop.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Connected Wallet</TableHead>
                      <TableHead>Staking Enabled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.filter(u => !u.isAdmin).map((u) => (
                      <TableRow key={u.id} data-testid={`staking-user-row-${u.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {u.fullName?.slice(0, 2).toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{u.fullName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell>
                          {u.connectedWallet ? (
                            <span className="font-mono text-xs">
                              {u.connectedWallet.slice(0, 6)}...{u.connectedWallet.slice(-4)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Not connected</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={u.stakingEnabled || false}
                            onCheckedChange={(checked) => {
                              const userConv = conversations?.find(c => c.userId === u.id);
                              enableStaking.mutate({ 
                                userId: u.id, 
                                enabled: checked,
                                conversationId: userConv?.id
                              });
                            }}
                            disabled={enableStaking.isPending}
                            data-testid={`switch-staking-${u.id}`}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Stakes</CardTitle>
                <CardDescription>View all user stakes</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {stakesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : stakes && stakes.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Expected Return</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stakes.map((stake) => (
                        <TableRow key={stake.id} data-testid={`admin-stake-row-${stake.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">
                                  {stake.user?.fullName?.slice(0, 2).toUpperCase() || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{stake.user?.fullName || "Unknown"}</p>
                                <p className="text-xs text-muted-foreground">{stake.user?.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">
                            {parseFloat(stake.amount).toLocaleString()} {stake.currency}
                          </TableCell>
                          <TableCell>{stake.periodDays} days</TableCell>
                          <TableCell className="text-accent font-semibold">
                            {parseFloat(stake.expectedReturn).toLocaleString()} {stake.currency}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={cn(
                              stake.status === "pending" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
                              stake.status === "active" && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
                              stake.status === "withdrawal_pending" && "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
                              stake.status === "completed" && "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                            )}>
                              {stake.status === "withdrawal_pending" ? "Withdrawal Pending" : stake.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {stake.createdAt ? format(new Date(stake.createdAt), "MMM dd, yyyy") : "-"}
                          </TableCell>
                          <TableCell>
                            {stake.status === "withdrawal_pending" ? (
                              <Button
                                size="sm"
                                onClick={() => approveStakeWithdrawal.mutate(stake.id)}
                                disabled={approveStakeWithdrawal.isPending}
                                data-testid={`button-approve-stake-${stake.id}`}
                              >
                                {approveStakeWithdrawal.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Approve
                                  </>
                                )}
                              </Button>
                            ) : stake.status === "completed" ? (
                              <span className="text-accent text-sm">Completed</span>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <Coins className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground">No stakes yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="space-y-6">
            {walletInfo?.configured && (
              <Card className="border-accent/50 bg-accent/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-accent">
                    <CheckCircle className="h-5 w-5" />
                    Private Key Wallet Configured
                  </CardTitle>
                  <CardDescription>
                    Receiving address is automatically derived from ADMIN_WALLET_PRIVATE_KEY secret.
                    This address will be used for both BEP20 and ERC20 networks.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label>Derived Receiving Address</Label>
                    <div className="p-3 bg-background rounded-md border font-mono text-sm break-all" data-testid="text-derived-address">
                      {walletInfo.address}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      All staking payments will be sent to this address on both BNB Chain and Ethereum.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {!walletInfo?.configured && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary" />
                    Receiving Wallet Addresses
                  </CardTitle>
                  <CardDescription>
                    Configure wallet addresses where staking payments will be received.
                    Users will send their stake payments to these addresses.
                    <br /><br />
                    <strong>Tip:</strong> Add ADMIN_WALLET_PRIVATE_KEY to secrets to auto-derive the address.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="bep20">BEP20 Receiving Address (BNB Smart Chain)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="bep20"
                        placeholder="0x..."
                        value={bep20Address}
                        onChange={(e) => setBep20Address(e.target.value)}
                        className="font-mono"
                        data-testid="input-bep20-address"
                      />
                      <Button 
                        onClick={() => saveSetting.mutate({ key: "receiving_wallet_bep20", value: bep20Address })}
                        disabled={saveSetting.isPending}
                        data-testid="button-save-bep20"
                      >
                        {saveSetting.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="erc20">ERC20 Receiving Address (Ethereum)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="erc20"
                        placeholder="0x..."
                        value={erc20Address}
                        onChange={(e) => setErc20Address(e.target.value)}
                        className="font-mono"
                        data-testid="input-erc20-address"
                      />
                      <Button 
                        onClick={() => saveSetting.mutate({ key: "receiving_wallet_erc20", value: erc20Address })}
                        disabled={saveSetting.isPending}
                        data-testid="button-save-erc20"
                      >
                        {saveSetting.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Edit User Balance
            </DialogTitle>
            <DialogDescription>
              Update balance for {editingUser?.fullName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="balance">Available Balance ($)</Label>
              <Input
                id="balance"
                type="number"
                step="0.01"
                value={editBalance}
                onChange={(e) => setEditBalance(e.target.value)}
                data-testid="input-edit-balance"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalInvested">Total Invested ($)</Label>
              <Input
                id="totalInvested"
                type="number"
                step="0.01"
                value={editTotalInvested}
                onChange={(e) => setEditTotalInvested(e.target.value)}
                data-testid="input-edit-total-invested"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalEarnings">Total Earnings ($)</Label>
              <Input
                id="totalEarnings"
                type="number"
                step="0.01"
                value={editTotalEarnings}
                onChange={(e) => setEditTotalEarnings(e.target.value)}
                data-testid="input-edit-total-earnings"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveUser} disabled={updateUser.isPending} data-testid="button-save-user">
              {updateUser.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
