"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  SendIcon, MessageSquareIcon, PaperclipIcon, SmileIcon, 
  FileIcon, FileTextIcon, ImageIcon, FileArchiveIcon, XIcon, 
  DownloadIcon, Loader2Icon 
} from "lucide-react";

type Attachment = {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
};

type Comment = {
  id: string;
  taskId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  createdAt: string;
  attachments?: Attachment[];
};

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return <ImageIcon className="size-8 text-blue-500" />;
  if (type === "application/pdf") return <FileTextIcon className="size-8 text-red-500" />;
  if (type.includes("zip") || type.includes("compressed")) return <FileArchiveIcon className="size-8 text-orange-500" />;
  return <FileIcon className="size-8 text-gray-500" />;
}

export function TaskChat({ taskId, sessionUserId, onClose }: { taskId: string; sessionUserId: string; onClose?: () => void }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Attachments state
  const [pendingAttachments, setPendingAttachments] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/tasks/${taskId}/comments`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setComments(d.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [taskId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments, pendingAttachments]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPendingAttachments((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removePendingAttachment = (index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setPendingAttachments((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  }, []);

  async function send() {
    if (!input.trim() && pendingAttachments.length === 0) return;
    
    setIsUploading(true);
    const text = input.trim();
    setInput("");
    
    // Simulate upload delay for attachments
    let uploadedFiles: Attachment[] = [];
    if (pendingAttachments.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // mock upload time
      uploadedFiles = pendingAttachments.map((f, idx) => ({
        id: `mock-att-${Date.now()}-${idx}`,
        name: f.name,
        size: f.size,
        type: f.type || "application/octet-stream",
        url: URL.createObjectURL(f), // fake URL for preview
      }));
      setPendingAttachments([]);
    }
    
    setIsUploading(false);

    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: text }),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      
      // Inject mock attachments into the new comment locally
      const newComment = { ...d.data, senderName: "You", senderAvatar: "", attachments: uploadedFiles };
      setComments((prev) => [...prev, newComment]);
    } catch {
      // If API fails, just append it locally for demonstration
      const localComment: Comment = {
        id: `mock-msg-${Date.now()}`,
        taskId,
        senderId: sessionUserId,
        senderName: "You",
        senderAvatar: "",
        content: text,
        createdAt: new Date().toISOString(),
        attachments: uploadedFiles,
      };
      setComments((prev) => [...prev, localComment]);
    }
  }

  return (
    <div 
      className={`flex flex-col h-full bg-white relative transition-all ${isDragging ? "ring-2 ring-blue-500 bg-blue-50/50" : ""}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-blue-500/10 backdrop-blur-[2px]">
          <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-3 animate-in zoom-in-95 duration-200">
            <div className="size-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <DownloadIcon className="size-8" />
            </div>
            <p className="text-lg font-bold text-gray-800">Drop files to attach</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 bg-white z-10">
        <div className="flex items-center gap-2">
          <MessageSquareIcon className="size-5 text-blue-600" />
          <span className="text-base font-semibold text-gray-900">Task Discussion</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground bg-gray-100 px-2 py-1 rounded-full">{comments.length} Messages</span>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="size-7 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full">
              <XIcon className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-60">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Loading discussion...</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-60">
            <MessageSquareIcon className="size-12 text-gray-300" />
            <span className="text-sm font-medium text-muted-foreground">Start the conversation</span>
          </div>
        ) : (
          comments.map((c, i) => {
            const isMe = c.senderId === sessionUserId;
            // Determine if the previous message was from the same user to group them
            const prevMessage = comments[i - 1];
            const isConsecutive = prevMessage && prevMessage.senderId === c.senderId;
            
            return (
              <div key={c.id} className={`flex gap-3 w-full ${isMe ? "flex-row-reverse" : ""}`}>
                {/* Avatar */}
                <div className={`shrink-0 ${isConsecutive ? "opacity-0" : "opacity-100"}`}>
                  <Avatar className="size-9 border shadow-sm">
                    {c.senderAvatar ? <AvatarImage src={c.senderAvatar} /> : null}
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {(c.senderName || "U").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                {/* Message Content */}
                <div className={`flex flex-col max-w-[85%] ${isMe ? "items-end" : "items-start"}`}>
                  {!isConsecutive && (
                    <div className="flex items-baseline gap-2 mb-1.5 px-1">
                      <span className="text-xs font-semibold text-gray-900">{isMe ? "You" : c.senderName}</span>
                      <span className="text-[10px] text-gray-500 font-medium">
                        {new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  )}
                  
                  {/* Text Bubble */}
                  {c.content && (
                    <div className={`rounded-2xl px-4 py-2.5 text-[14px] shadow-sm leading-relaxed ${
                      isMe 
                        ? "bg-blue-600 text-white rounded-tr-sm" 
                        : "bg-gray-100 text-gray-900 rounded-tl-sm border border-gray-200"
                    }`}>
                      {c.content}
                    </div>
                  )}

                  {/* Attachments */}
                  {c.attachments && c.attachments.length > 0 && (
                    <div className={`flex flex-col gap-2 mt-2 w-full max-w-[280px]`}>
                      {c.attachments.map(att => (
                        <div key={att.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow group cursor-pointer">
                          <div className="shrink-0 bg-gray-50 p-2 rounded-lg">
                            {getFileIcon(att.type)}
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-sm font-medium text-gray-900 truncate">{att.name}</span>
                            <span className="text-[11px] text-gray-500 font-medium">{formatBytes(att.size)}</span>
                          </div>
                          <a href={att.url} download={att.name} className="shrink-0 text-gray-400 hover:text-blue-600 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <DownloadIcon className="size-4" />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} className="h-2" />
      </div>

      {/* Input Area */}
      <div className="shrink-0 bg-gray-50 border-t p-4 z-10">
        
        {/* Pending Attachments */}
        {pendingAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {pendingAttachments.map((file, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-white border border-gray-200 shadow-sm rounded-lg pl-2 pr-1 py-1 text-xs font-medium text-gray-700">
                <span className="truncate max-w-[120px]">{file.name}</span>
                <button 
                  onClick={() => removePendingAttachment(idx)}
                  className="p-1 hover:bg-gray-100 rounded-md text-gray-500 hover:text-red-500 transition-colors"
                >
                  <XIcon className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="flex flex-col gap-2 bg-white rounded-xl border border-gray-200 shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all p-1"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Write a message..."
            className="w-full min-h-[60px] max-h-[120px] resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-gray-400"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <div className="flex items-center justify-between px-2 pb-1">
            <div className="flex items-center gap-1">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                multiple 
                onChange={handleFileSelect}
              />
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="size-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <PaperclipIcon className="size-4" />
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="size-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                onClick={() => setInput(prev => prev + "😀")}
              >
                <SmileIcon className="size-4" />
              </Button>
            </div>
            <Button 
              type="submit" 
              size="sm" 
              className={`rounded-full px-4 font-semibold shadow-sm transition-all ${
                (!input.trim() && pendingAttachments.length === 0) 
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed hover:bg-gray-100" 
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
              disabled={(!input.trim() && pendingAttachments.length === 0) || isUploading}
            >
              {isUploading ? (
                <Loader2Icon className="size-4 animate-spin mr-1.5" />
              ) : (
                <SendIcon className="size-4 mr-1.5" />
              )}
              Send
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
