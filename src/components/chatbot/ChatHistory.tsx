import { Conversation } from "./types";
import { MessageSquare, Trash2, Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatHistoryProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

const ChatHistory = ({ conversations, activeId, onSelect, onNew, onDelete, onBack }: ChatHistoryProps) => (
  <div className="flex flex-col h-full">
    <div className="flex items-center justify-between p-3 border-b">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <Button variant="ghost" size="sm" onClick={onNew} className="gap-1">
        <Plus className="h-3.5 w-3.5" /> New
      </Button>
    </div>
    <div className="flex-1 overflow-y-auto">
      {conversations.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">No previous chats</p>
      ) : (
        <div className="p-2 space-y-1">
          {conversations.map((c) => (
            <div
              key={c.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer group transition-colors ${
                activeId === c.id ? "bg-accent" : "hover:bg-muted"
              }`}
              onClick={() => onSelect(c.id)}
            >
              <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{c.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(c.updated_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

export default ChatHistory;
