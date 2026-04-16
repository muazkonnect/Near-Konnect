import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Droplet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

interface Props {
  trigger?: React.ReactNode;
}

const BloodRequestDialog = ({ trigger }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bloodGroup, setBloodGroup] = useState("");
  const [urgency, setUrgency] = useState("normal");
  const [city, setCity] = useState("");
  const [message, setMessage] = useState("");
  const [step, setStep] = useState(1);

  const handleSubmit = async () => {
    if (!user || !bloodGroup) {
      toast.error("Please select a blood group");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("blood_requests").insert({
      requester_id: user.id,
      blood_group: bloodGroup,
      urgency,
      city: city || null,
      message: message || null,
    });
    setLoading(false);
    if (error) {
      toast.error("Failed to submit request");
    } else {
      toast.success("Blood request submitted! Matching donors will be notified.");
      setOpen(false);
      setStep(1);
      setBloodGroup("");
      setUrgency("normal");
      setCity("");
      setMessage("");
    }
  };

  const nextStep = () => {
    if (step === 1 && !bloodGroup) {
      toast.error("Please select a blood group");
      return;
    }
    setStep((prev) => Math.min(prev + 1, 3));
  };

  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
            <Droplet className="h-4 w-4" /> Request Blood
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Droplet className="h-5 w-5" /> Guided Blood Request
          </DialogTitle>
        </DialogHeader>

        <div className="mt-1 space-y-3">
          <div className="space-y-2">
            <div className="h-2 w-full rounded-full bg-muted">
              <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${(step / 3) * 100}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">Step {step} of 3</p>
          </div>

          {step === 1 && (
            <div>
            <Label>Blood Group Needed *</Label>
            <Select value={bloodGroup} onValueChange={setBloodGroup}>
              <SelectTrigger className="mt-1.5 rounded-xl">
                <SelectValue placeholder="Select blood group" />
              </SelectTrigger>
              <SelectContent>
                {BLOOD_GROUPS.map((bg) => (
                  <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>
          )}

          {step === 2 && (
            <div>
            <Label>Urgency Level</Label>
            <div className="flex gap-2 mt-1.5">
              {[
                { value: "normal", label: "Normal", color: "bg-success/15 text-success border-success/20" },
                { value: "urgent", label: "Urgent", color: "bg-warning/15 text-warning border-warning/20" },
                { value: "critical", label: "Critical", color: "bg-destructive/15 text-destructive border-destructive/20" },
              ].map((u) => (
                <Badge
                  key={u.value}
                  variant="outline"
                  className={`cursor-pointer px-4 py-1.5 rounded-full text-sm transition-all ${urgency === u.value ? u.color + " font-semibold ring-2 ring-offset-1 ring-current" : "hover:bg-muted"}`}
                  onClick={() => setUrgency(u.value)}
                >
                  {u.value === "critical" && <AlertTriangle className="mr-1 h-3 w-3" />}
                  {u.label}
                </Badge>
              ))}
            </div>
            </div>
          )}

          {step === 3 && (
            <>
              <div>
            <Label>City / Location</Label>
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Lahore, Karachi"
              className="mt-1.5 rounded-xl"
            />
          </div>
          <div>
            <Label>Additional Details</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Any details about the patient or hospital..."
              className="mt-1.5 rounded-xl resize-none"
              rows={3}
            />
          </div>
            </>
          )}

          <div className="flex gap-2 pt-1">
            {step > 1 && (
              <Button onClick={prevStep} variant="outline" className="flex-1 rounded-xl">
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button onClick={nextStep} className="flex-1 rounded-xl">
                Continue
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading || !bloodGroup}
                className="flex-1 h-11 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {loading ? "Submitting..." : "Submit Request"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BloodRequestDialog;
