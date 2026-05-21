import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import RoleSelectDialog from "@/components/RoleSelectDialog";

interface AuthRequiredDialogProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

const AuthRequiredDialog = ({
  children,
  title = "Login required",
  description = "Create an account or log in to contact this service.",
}: AuthRequiredDialogProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const redirect = location.pathname + location.search;

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="relative rounded-2xl [&>button.absolute]:hidden">
        <DialogClose asChild>
          <button
            className="absolute right-4 top-4 z-10 rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </DialogClose>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => navigate(`/login?redirect=${encodeURIComponent(redirect)}`)}>Log In</Button>
          <RoleSelectDialog redirect={redirect}>
            <Button>Sign Up</Button>
          </RoleSelectDialog>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AuthRequiredDialog;
