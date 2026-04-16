import { QUICK_REPLIES } from "./types";

interface QuickRepliesProps {
  onSelect: (message: string) => void;
  disabled: boolean;
}

const QuickReplies = ({ onSelect, disabled }: QuickRepliesProps) => (
  <div className="flex flex-wrap gap-1.5 px-3 py-2">
    {QUICK_REPLIES.map((qr) => (
      <button
        key={qr.label}
        onClick={() => onSelect(qr.message)}
        disabled={disabled}
        className="text-xs px-2.5 py-1.5 rounded-full border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
      >
        {qr.label}
      </button>
    ))}
  </div>
);

export default QuickReplies;
