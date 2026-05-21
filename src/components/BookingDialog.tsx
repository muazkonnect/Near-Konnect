import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  workerId: string;
  workerName: string;
  children: React.ReactNode;
}

const timeSlots = [
  "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM",
  "05:00 PM", "06:00 PM", "07:00 PM", "08:00 PM",
];

const BookingDialog = ({ workerId, workerName, children }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const ensureProfileExists = async () => {
    if (!user) return;
    // bookings.customer_id may FK to profiles.user_id in some schemas.
    // Upserting is safe and prevents a first-booking race.
    await supabase
      .from("profiles")
      .upsert(
        { user_id: user.id, full_name: (user.user_metadata as any)?.full_name || user.email?.split("@")[0] || "User" },
        { onConflict: "user_id" }
      );
  };

  const handleSubmit = async () => {
    if (!user) { toast.error("Please log in first"); return; }
    if (!date || !time) { toast.error("Please select date and time"); return; }
    if (!description.trim()) { toast.error("Please describe the service needed"); return; }

    setSubmitting(true);
    await ensureProfileExists();

    const payload = {
      customer_id: user.id,
      worker_id: workerId,
      booking_date: format(date, "yyyy-MM-dd"),
      booking_time: time,
      service_description: description.trim(),
    };

    let { error } = await supabase.from("bookings").insert(payload);
    // One retry for profile FK races / delayed triggers
    if (error && String((error as any).code || "").includes("23503")) {
      await ensureProfileExists();
      ({ error } = await supabase.from("bookings").insert(payload));
    }
    setSubmitting(false);

    if (error) {
      toast.error(error.message || "Failed to book. Please try again.");
    } else {
      toast.success(`Booking sent to ${workerName}!`);
      setOpen(false);
      setDate(undefined);
      setTime("");
      setDescription("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        onPointerDownOutside={() => setOpen(false)}
        onInteractOutside={() => setOpen(false)}
        className="sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle>Book {workerName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Select Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal mt-1.5", !date && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d < new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Select Time</Label>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Choose a time slot" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map(t => (
                  <SelectItem key={t} value={t}>
                    <span className="flex items-center gap-2">
                      <Clock className="w-3 h-3" /> {t}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Describe the service you need</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Fix leaking kitchen faucet..."
              rows={3}
              className="mt-1.5"
            />
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting ? "Booking..." : "Confirm Booking"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingDialog;
