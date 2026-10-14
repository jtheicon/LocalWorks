import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { MessageSquare } from "lucide-react";

type Contact = {
  _id: string;

  worker: string;

  employerId: {
    _id: string;
    email: string;
    company: string;
    industry: {
      title: string;
    };
  };

  title: string;
  description: string;

  lastMessage: string;
  lastMessageAt: string;

  unreadCountWorker: number;

  status: "active" | "archived" | "blocked";

  employerName?: string;
  company?: string;
};

const Contacts = () => {
  const queryClient = useQueryClient()

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const [selectedChat, setSelectedChat] =
    useState<Contact | null>(null);

  const [message, setMessage] =
    useState("");

  const [selectedEmployer, setSelectedEmployer] =
    useState<Contact | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const fetchContacts = async () => {
    const { data } = await axios.get(
      "http://localhost:8920/api/pro/contacts",
      {
        withCredentials: true,
      }
    );

    return data;
  };
    
  const fetchMessages = async () => {
    if (!selectedChat) {
      throw new Error("No selected chat");
    }

    const { data } = await axios.get(
      `http://localhost:8920/api/pro/message/${selectedChat._id}`,
      {
        withCredentials: true,
      }
    );

    return data.ViewMessages;
  };

  const {
    data: messages,
    isLoading: loadingMessages,
  } = useQuery({
    queryKey: ["messages", selectedChat?._id],
    queryFn: fetchMessages,
    enabled: !!selectedChat,
    refetchOnWindowFocus: false,
  });


  const { data, isLoading, error } = useQuery({
    queryKey: ["contacts"],
    queryFn: fetchContacts,
  });
    
  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!selectedChat) {
        throw new Error("No selected chat");
      }

      const response = await axios.post(
        `http://localhost:8920/api/pro/message/${selectedChat._id}`,
        {
          content: message.trim(),
          recipient: selectedChat.employerId._id, // or employerId depending on role
        },
        { withCredentials: true }
      );

      return response.data;
    },

    onSuccess: () => {
      setMessage("");

      queryClient.invalidateQueries({
        queryKey: ["messages", selectedChat?._id],
      });
    },

    onError: (error: any) => {
      console.error(
        error?.response?.data || error.message
      );
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (contactId: string) => {
      const { data } = await axios.patch(
        `http://localhost:8920/api/pro/contacts/${contactId}/read`,
        {},
        {
          withCredentials: true,
        }
      );

      return data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["contacts"],
      });
    },
  });

    
  useEffect(() => {
    requestAnimationFrame(() => {
      const container = messagesContainerRef.current;

      if (!container) return;

      container.scrollTop = container.scrollHeight;
    });
  }, [messages, selectedChat]);

  if (isLoading) {
    return <div className="text-center py-10">Loading...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-10 text-red-500">
        Failed to load contacts
      </div>
    );
  }

  const contacts: Contact[] = [...(data?.contacts || [])].sort((a, b) => {
    return (
      new Date(b.lastMessageAt).getTime() -
      new Date(a.lastMessageAt).getTime()
    );
  });

  return (
    <>
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Contacts</h2>

          <p className="text-muted-foreground">
            Conversations with employers
          </p>
        </div>

        <div className="grid gap-4">
          {contacts.length ? (
            contacts.map((c) => (
              <Card key={c._id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between">
                    <div>
                      <CardTitle>{c.title}</CardTitle>

                      <CardDescription className="flex items-center gap-2 text-xs mt-3">
                        {c.unreadCountWorker > 0 && <span className="h-2 w-2 rounded-full bg-primary" />}

                        <span>
                          Employer email: {c.employerId.email}
                        </span>
                      </CardDescription>
                    </div>

                    {c.unreadCountWorker > 0 && (
                      <Badge>
                        {c.unreadCountWorker} new
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="flex gap-2 text-sm text-muted-foreground mb-3">
                    <MessageSquare className="w-4 h-4" />
                    {c.description}
                  </div>

                  <div className="text-xs text-muted-foreground mb-4">
                    {new Date(
                      c.lastMessageAt
                    ).toLocaleString()}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedChat(c);

                        if (c.unreadCountWorker > 0) {
                          markAsRead.mutate(c._id);
                        }
                      }}
                    >
                      Open
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setSelectedEmployer(c)
                      }
                    >
                      View Employer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              No contacts available.
            </div>
          )}
        </div>
      </div>

  <Dialog
    open={!!selectedChat}
    onOpenChange={(open) => {
      if (!open) {
        setSelectedChat(null);
        setMessage("");
      }
    }}
  >


  <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
    <DialogHeader>
      <DialogTitle>
        Conversation
      </DialogTitle>

      <DialogDescription>
        {selectedChat?.employerId.email}
      </DialogDescription>
    </DialogHeader>

    <div ref={messagesContainerRef} className="flex-1 overflow-y-auto space-y-3 min-h-0">

      {loadingMessages ? (
  <p>Loading messages...</p>
      ) : messages?.length ? (
        messages.map((msg: any) => (
          <div
            key={msg._id}
            className={`
              rounded-lg p-3
              ${
                msg.senderRole === "worker"
                  ? "ml-auto bg-primary text-primary-foreground max-w-[80%]"
                  : "bg-muted max-w-[80%]"
              }
            `}
          >
            <p>{msg.content}</p>

            <p className="text-xs opacity-70 mt-1">
              {new Date(msg.createdAt).toLocaleString()}
            </p>
          </div>
        ))
      ) : (
        <div className="text-center text-sm text-muted-foreground">
          No messages yet.
        </div>
      )}
      <div ref={bottomRef} />
    </div>

    <div className="flex gap-2 pt-4">

      <input
        value={message}
        onChange={(e) =>
          setMessage(e.target.value)
        }
        placeholder="Reply..."
        className="flex-1 border rounded-md px-3"
      />

      <Button
        disabled={!message.trim()}
          onClick={() => sendMessage.mutate()}
        >
        {sendMessage.isPending ? "Sending..." : "Send"}
      </Button>

    </div>
  </DialogContent>
</Dialog>

      <Dialog
        open={!!selectedEmployer}
        onOpenChange={(open) => {
          if (!open) setSelectedEmployer(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Employer Details
            </DialogTitle>

            <DialogDescription>
              Information about this employer
            </DialogDescription>
          </DialogHeader>

          {selectedEmployer && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">
                  Company
                </p>

                <p className="text-muted-foreground">
                  {selectedEmployer.employerId.company ||
                    "N/A"}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium">
                  Employer Industry
                </p>

                <p className="text-muted-foreground">
                  {selectedEmployer.employerId.industry.title ||
                    "N/A"}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium">
                  Email
                </p>

                <p className="text-muted-foreground">
                  {selectedEmployer.employerId.email}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium">
                  Status
                </p>

                <Badge>
                  {selectedEmployer.status}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      
    </>
  );
};

export default Contacts;