import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAppSetting, useUpdateAppSetting } from "@/hooks/useAppSettings";
import { Loader2, Save, Megaphone, AlertTriangle, X } from "lucide-react";

export default function AnnouncementBarTab() {
  const messages = useAppSetting("announcement_messages");
  const special = useAppSetting("special_announcement");
  const tickerSpeed = useAppSetting("announcement_ticker_speed_seconds");
  const update = useUpdateAppSetting();
  const [text, setText] = useState("");
  const [specialText, setSpecialText] = useState("");
  const [hours, setHours] = useState<number>(24);
  const [speed, setSpeed] = useState<number>(30);

  useEffect(() => {
    setSpeed(tickerSpeed || 30);
  }, [tickerSpeed]);

  useEffect(() => {
    setText((messages || []).join("\n"));
  }, [messages]);

  useEffect(() => {
    setSpecialText(special?.text || "");
  }, [special?.text]);

  const save = async () => {
    try {
      const list = text
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      await update.mutateAsync({ key: "announcement_messages", value: list });
      toast.success("Announcement messages saved");
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    }
  };

  const publishSpecial = async () => {
    const t = specialText.trim();
    if (!t) return toast.error("Enter an announcement message");
    const h = Math.max(0.1, Number(hours) || 0);
    const expires_at = new Date(Date.now() + h * 60 * 60 * 1000).toISOString();
    try {
      await update.mutateAsync({ key: "special_announcement", value: { text: t, expires_at } });
      toast.success(`Special announcement live for ${h}h`);
    } catch (e: any) {
      toast.error(e?.message || "Publish failed");
    }
  };

  const clearSpecial = async () => {
    try {
      await update.mutateAsync({ key: "special_announcement", value: null });
      toast.success("Special announcement cleared");
    } catch (e: any) {
      toast.error(e?.message || "Clear failed");
    }
  };

  const isActive =
    !!special?.text?.trim() &&
    (!special.expires_at || new Date(special.expires_at).getTime() > Date.now());

  return (
    <div className="space-y-4">
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" /> Special Announcement
          </CardTitle>
          <CardDescription>
            When active, this replaces the normal activity ticker with a highlighted message for the duration set below.
            After it expires, normal activity resumes automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isActive && (
            <div className="flex items-start justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
              <div className="text-sm">
                <p className="font-semibold text-destructive-foreground">Currently active</p>
                <p className="mt-1">{special!.text}</p>
                {special!.expires_at && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Expires {new Date(special!.expires_at).toLocaleString()}
                  </p>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={clearSpecial} disabled={update.isPending}>
                <X className="mr-1 h-4 w-4" /> Clear
              </Button>
            </div>
          )}
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              rows={3}
              value={specialText}
              onChange={(e) => setSpecialText(e.target.value)}
              placeholder="E.g. Service maintenance tonight 10–11 PM"
            />
          </div>
          <div className="space-y-2">
            <Label>Duration (hours)</Label>
            <Input
              type="number"
              min={0.1}
              step={0.5}
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="max-w-[160px]"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={publishSpecial} disabled={update.isPending} variant="destructive">
              {update.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertTriangle className="mr-2 h-4 w-4" />}
              Publish special announcement
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" /> Announcement Bar
          </CardTitle>
          <CardDescription>
            These messages appear in the top activity ticker on the homepage, interleaved with live activity
            (new signups, sparks bought, blood requests, etc.). One message per line.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Static announcement messages</Label>
            <Textarea
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"Welcome to Near Konnect\nSafety protocols updated\nBuy Sparks to boost visibility"}
            />
            <p className="text-xs text-muted-foreground">
              Tip: Keep messages short (under 80 characters) so they fit nicely in the ticker.
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={save} disabled={update.isPending}>
              {update.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
