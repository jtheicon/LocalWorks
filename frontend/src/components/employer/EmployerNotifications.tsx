import { useState } from "react";
import { MessageCircle, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  notifications: Notification[];
  markAsReadMutation: any;
  deleteMutation: any;
  markAllAsReadMutation: any;
}

interface Notification {
  _id: string;
  type: string;
  title: string;
  description: string;
  details?: string;
  createdAt: string;
  read: boolean;
}

const formatUTC = (utc: string) =>
  new Date(utc).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });


export default function EmployerNotifications({
  notifications,
  markAsReadMutation,
  deleteMutation,
  markAllAsReadMutation,
}: Props) {

  const [selected, setSelected] = useState<Notification | null>(null);

  const sortedNotifications = [...notifications].sort((a, b) => {
    return Number(a.read) - Number(b.read);
  });

  return (
    <main className="flex-1 p-6 space-y-6">

      <div className="flex items-center justify-between">

      <div>
        <h2 className="text-xl font-bold">
          Employer Notifications
        </h2>

        <p className="text-sm text-muted-foreground">
          Updates about applications, workers, and system activity
        </p>
      </div>


      {notifications.some(n => !n.read) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsReadMutation.mutate()}
          >
            Mark all as read
          </Button>
        )}

      </div>

      <ScrollArea className="h-[calc(100vh-220px)]">

        {!notifications.length ? (
          <div>No notifications yet.</div>
        ) : (

          <div className="space-y-3">

          {sortedNotifications.map((n)=>(
            
            <div
              key={n._id}
              className={`flex items-center gap-4 p-4 border rounded-lg ${
                n.read ? "bg-muted/40" : "bg-card"
              }`}
            >

              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">

                <MessageCircle className="w-4 h-4 text-primary-foreground"/>

              </div>


              <div className="flex-1">

                <p className={n.read ? "font-medium" : "font-bold"}>
                  {n.title}
                </p>

                <p className="text-xs text-muted-foreground">
                  {n.description}
                </p>

                <p className="text-[11px] text-muted-foreground">
                  {formatUTC(n.createdAt)}
                </p>

              </div>


              <div className="flex gap-2">


              {!n.read && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={()=> {
                    markAsReadMutation.mutate(n._id)
                  }}
                >
                  Mark read
                </Button>
              )}



              <Button
                size="sm"
                variant="ghost"
                onClick={()=>setSelected(n)}
              >
                View
              </Button>



              <DropdownMenu>

                <DropdownMenuTrigger asChild>

                  <Button size="icon" variant="ghost">
                    <MoreHorizontal className="w-4 h-4"/>
                  </Button>

                </DropdownMenuTrigger>


                <DropdownMenuContent>

                  {!n.read &&
                  <DropdownMenuItem
                    onClick={()=>markAsReadMutation.mutate(n._id)}
                  >
                    Mark as read
                  </DropdownMenuItem>
                  }


                  <DropdownMenuItem
                    onClick={()=>setSelected(n)}
                  >
                    View
                  </DropdownMenuItem>



                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={()=>deleteMutation.mutate(n._id)}
                  >
                    Delete
                  </DropdownMenuItem>


                </DropdownMenuContent>

              </DropdownMenu>


              </div>

            </div>

          ))}

          </div>

        )}

      </ScrollArea>



      <Dialog
        open={!!selected}
        onOpenChange={()=>setSelected(null)}
      >

        <DialogContent>

          <DialogHeader>

            <DialogTitle>
              {selected?.title}
            </DialogTitle>

          </DialogHeader>


          <p className="text-sm">
            {selected?.details}
          </p>


          <p className="text-xs text-muted-foreground">
            {selected && formatUTC(selected.createdAt)}
          </p>


          {selected && !selected.read && (

            <Button
              onClick={()=>{
                markAsReadMutation.mutate(selected._id);
                setSelected(null);
              }}
            >
              Mark as read
            </Button>

          )}


        </DialogContent>

      </Dialog>


    </main>
  );
}