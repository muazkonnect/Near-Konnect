import { useAuth } from "@/contexts/AuthContext";
import { Lock } from "lucide-react";

interface Props {
  currentUrl?: string | null;
  size?: number;
}

// Profile photos are set once during signup via face verification and are
// permanent. This component renders a read-only avatar with a lock badge.
const AvatarUpload = ({ currentUrl, size = 96 }: Props) => {
  const { user } = useAuth();

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
    : "?";

  return (
    <div className="relative" style={{ width: size, height: size }} title="Profile photo is locked (set at signup via face verification)">
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
      <div className="absolute -bottom-1 -right-1 rounded-full bg-background border border-border p-1 shadow-sm">
        <Lock className="w-3 h-3 text-muted-foreground" />
      </div>
    </div>
  );
};

export default AvatarUpload;
