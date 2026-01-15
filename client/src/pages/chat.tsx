import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Send, Loader2, MessageSquare, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Conversation, ChatMessage } from "@shared/schema";

export default function ChatPage() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const { user } = useAuth();

  const { data: conversations, isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

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

  const createConversation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/conversations", { subject: "General Support" });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedConversation(data.id);
    },
  });

  const handleSend = async () => {
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

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-3xl font-bold">Support Chat</h1>
        <p className="text-muted-foreground">Connect with our admin support team</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr] h-[calc(100%-5rem)]">
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
            <CardTitle className="text-lg">Conversations</CardTitle>
            <Button
              size="sm"
              onClick={() => createConversation.mutate()}
              disabled={createConversation.isPending}
              data-testid="button-new-conversation"
            >
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
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
                  <p className="text-sm text-muted-foreground">No conversations yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Start a new chat with support</p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {conversations?.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg transition-colors hover-elevate",
                        selectedConversation === conv.id
                          ? "bg-primary/10"
                          : "hover:bg-muted"
                      )}
                      data-testid={`conversation-${conv.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-[hsl(152,69%,40%)] text-white text-xs">AD</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {conv.subject || "Support Chat"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {conv.createdAt ? format(new Date(conv.createdAt), "MMM dd, HH:mm") : ""}
                          </p>
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
                Choose a conversation from the left or start a new chat with our support team
              </p>
            </CardContent>
          ) : (
            <>
              <CardHeader className="flex flex-row items-center gap-3 border-b py-4">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-[hsl(152,69%,40%)] text-white">AD</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base">Admin Support</CardTitle>
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-xs text-muted-foreground">Online</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 p-0 flex flex-col min-h-0">
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex gap-3",
                            msg.senderType === "user" ? "justify-end" : "justify-start"
                          )}
                        >
                          {msg.senderType === "admin" && (
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className="bg-[hsl(152,69%,40%)] text-white text-xs">AD</AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={cn(
                              "max-w-[70%] rounded-lg px-4 py-2",
                              msg.senderType === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            )}
                          >
                            <p className="text-sm">{msg.message}</p>
                            <p className={cn(
                              "text-xs mt-1",
                              msg.senderType === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}>
                              {msg.createdAt ? format(new Date(msg.createdAt), "HH:mm") : ""}
                            </p>
                          </div>
                          {msg.senderType === "user" && user && (
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {getInitials(user.fullName)}
                              </AvatarFallback>
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
                      handleSend();
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      disabled={isLoading}
                      data-testid="input-chat-message"
                    />
                    <Button type="submit" disabled={isLoading || !newMessage.trim()} data-testid="button-send-message">
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </form>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
