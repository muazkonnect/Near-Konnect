import { useState, useRef } from "react";
import { Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  currentUrl?: string | null;
  onUpload: (url: string) => void;
  size?: number;
}

const AvatarUpload = ({ currentUrl, onUpload, size = 96 }: Props) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Upload failed");
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    onUpload(publicUrl);
    setUploading(false);
    toast.success("Photo uploaded!");
  };

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
    : "?";

  return (
    <div
      className="relative cursor-pointer group"
      style={{ width: size, height: size }}
      onClick={() => inputRef.current?.click()}
    >
      {currentUrl ? (
        <img
          src={currentUrl}
          alt="Avatar"
          className="w-full h-full rounded-2xl object-cover border-2 border-border"
        />
      ) : (
        <div className="w-full h-full rounded-2xl bg-accent flex items-center justify-center text-2xl font-bold text-accent-foreground border-2 border-border">
          {initials}
        </div>
      )}
      <div className="absolute inset-0 rounded-2xl bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Camera className="w-6 h-6 text-background" />
      </div>
      {uploading && (
        <div className="absolute inset-0 rounded-2xl bg-background/60 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
    </div>
  );
};

export default AvatarUpload;
