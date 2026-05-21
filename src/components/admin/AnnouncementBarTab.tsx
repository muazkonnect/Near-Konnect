import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAppSetting, useUpdateAppSetting } from "@/hooks/useAppSettings";
import { Loader2, Save, Megaphone } from "lucide-react";

export default function AnnouncementBarTab() {
  const messages = useAppSetting("announcement_messages");
  const update = useUpdateAppSetting();
  const [text, setText] = useState("");

  useEffect(() => {
    setText((messages || []).join("\n"));
  }, [messages]);

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

  return (
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
  );
}
