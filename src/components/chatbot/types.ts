export type Msg = { role: "user" | "assistant"; content: string };

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-chat`;

export const QUICK_REPLIES = [
  { label: "🔧 Find a plumber", message: "I need a plumber nearby" },
  { label: "⚡ Electrical help", message: "I have an electrical problem" },
  { label: "🎨 Find a painter", message: "I need a painter for my house" },
  { label: "📅 My bookings", message: "How can I check my bookings?" },
  { label: "🛠️ DIY tips", message: "Give me some DIY maintenance tips" },
];

export const PAGE_GREETINGS: Record<string, string> = {
  "/": "Welcome! 👋 Need help finding a service professional or have a home issue to solve?",
  "/discover": "Looking for a specific professional? Tell me what you need and I'll recommend the best-rated ones nearby! 🔍",
  "/dashboard": "Hi! Need help with your bookings or want to find a new service provider? 📋",
  "/worker-dashboard": "Hello! Need help managing your profile or understanding your bookings? 💼",
  "/messages": "Need help with your conversations or want to reach out to a professional? 💬",
};

export function getGreeting(pathname: string): string {
  // Check exact match first, then prefix match
  if (PAGE_GREETINGS[pathname]) return PAGE_GREETINGS[pathname];
  if (pathname.startsWith("/worker/")) return "Interested in this worker? I can help you decide or find similar professionals! 🤝";
  return PAGE_GREETINGS["/"]!;
}
