import ReactMarkdown from "react-markdown";
import { Msg } from "./types";
import { User, Bot } from "lucide-react";

interface ChatMessageProps {
  msg: Msg;
}

const ChatMessage = ({ msg }: ChatMessageProps) => (
  <div className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
    {msg.role === "assistant" && (
      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
        <Bot className="h-3.5 w-3.5 text-primary" />
      </div>
    )}
    <div
      className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
        msg.role === "user"
          ? "bg-primary text-primary-foreground rounded-br-md"
          : "bg-muted text-foreground rounded-bl-md"
      }`}
    >
      {msg.role === "assistant" ? (
        <div className="prose prose-sm max-w-none dark:prose-invert [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0 [&_a]:text-primary [&_a]:underline">
          <ReactMarkdown
            components={{
              a: ({ href, children }) => (
                <a href={href} className="text-primary underline" target={href?.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
                  {children}
                </a>
              ),
            }}
          >
            {msg.content}
          </ReactMarkdown>
        </div>
      ) : (
        <p>{msg.content}</p>
      )}
    </div>
    {msg.role === "user" && (
      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1">
        <User className="h-3.5 w-3.5 text-primary-foreground" />
      </div>
    )}
  </div>
);

export default ChatMessage;
