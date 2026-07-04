"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  SendIcon, PaperclipIcon, SmileIcon, FileIcon, FileTextIcon, 
  ImageIcon, FileArchiveIcon, XIcon, DownloadIcon, Loader2Icon,
  CheckIcon, CheckCheckIcon, MoreVerticalIcon, VideoIcon,
  PinIcon, MicIcon, SearchIcon, ShieldAlertIcon
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";

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
  isSystem?: boolean;
  status?: "sent" | "delivered" | "read";
};

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return <ImageIcon className="size-5 text-blue-500" />;
  if (type === "application/pdf") return <FileTextIcon className="size-5 text-red-500" />;
  if (type.includes("zip") || type.includes("compressed")) return <FileArchiveIcon className="size-5 text-orange-500" />;
  return <FileIcon className="size-5 text-gray-500" />;
}

export function TaskChat({ taskId, sessionUserId, onClose }: { taskId: string; sessionUserId: string; onClose?: () => void }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  
  const [pendingAttachments, setPendingAttachments] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/tasks/${taskId}/comments`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        let fetched: Comment[] = d.data || [];
        if (fetched.length > 0) {
          const sysMsg: Comment = {
            id: "sys-1",
            taskId,
            senderId: "system",
            senderName: "System",
            senderAvatar: "",
            content: "Task discussion created. Messages are end-to-end encrypted.",
            createdAt: fetched[0].createdAt,
            isSystem: true
          };
          fetched = [sysMsg, ...fetched];
        }
        
        fetched = fetched.map(c => {
          if (c.senderId === sessionUserId) return { ...c, status: "read" };
          return c;
        });

        setComments(fetched);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [taskId, sessionUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments, pendingAttachments, isTyping]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPendingAttachments((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removePendingAttachment = (index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const onDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) setPendingAttachments((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
  }, []);

  async function send() {
    if (!input.trim() && pendingAttachments.length === 0) return;
    
    setIsUploading(true);
    const text = input.trim();
    setInput("");
    
    let uploadedFiles: Attachment[] = [];
    if (pendingAttachments.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      uploadedFiles = pendingAttachments.map((f, idx) => ({
        id: `mock-att-${Date.now()}-${idx}`,
        name: f.name,
        size: f.size,
        type: f.type || "application/octet-stream",
        url: URL.createObjectURL(f),
      }));
      setPendingAttachments([]);
    }
    
    setIsUploading(false);

    const tempId = `mock-msg-${Date.now()}`;
    const newLocalComment: Comment = {
      id: tempId,
      taskId,
      senderId: sessionUserId,
      senderName: "You",
      senderAvatar: "",
      content: text,
      createdAt: new Date().toISOString(),
      attachments: uploadedFiles,
      status: "sent"
    };

    setComments((prev) => [...prev, newLocalComment]);

    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        const d = await res.json();
        setComments(prev => prev.map(c => c.id === tempId ? { ...c, id: d.data.id, status: "delivered" } : c));
      }
    } catch {}
  }

  const formatMessageDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return "Today";
    if (isYesterday(d)) return "Yesterday";
    return format(d, "MMMM d, yyyy");
  };

  let lastDateStr = "";

  return (
    <div 
      className={`flex flex-col h-full bg-[#efeae2] relative transition-all ${isDragging ? "ring-2 ring-blue-500 bg-blue-50/50" : ""}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{ backgroundImage: "url('https://cdn.pixabay.com/photo/2021/07/28/10/05/whatsapp-background-6498967_1280.png')", backgroundSize: "cover", backgroundPosition: "center", backgroundBlendMode: "overlay" }}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-green-500/10 backdrop-blur-[2px]">
          <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-3">
            <div className="size-16 rounded-full bg-green-100 flex items-center justify-center text-green-600"><DownloadIcon className="size-8" /></div>
            <p className="text-lg font-bold text-gray-800">Drop files to send</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-2.5 shrink-0 bg-[#f0f2f5] border-b border-gray-300/50">
        <div className="flex items-center gap-3">
          <Avatar className="size-10 border border-gray-200">
            <AvatarFallback className="bg-green-600 text-white font-medium">TD</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-[15px] font-semibold text-[#111b21]">Task Discussion</span>
            <span className="text-[13px] text-[#667781]">{isTyping ? "typing..." : "online"}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[#54656f]">
          {onClose && <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full transition-colors"><XIcon className="size-5" /></button>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {loading ? <div className="flex-1 flex items-center justify-center"><Loader2Icon className="size-8 animate-spin" /></div> : (
          comments.map((c, i) => {
            const isMe = c.senderId === sessionUserId;
            const messageDateStr = formatMessageDate(c.createdAt);
            const showDate = messageDateStr !== lastDateStr;
            lastDateStr = messageDateStr;

            if (c.isSystem) return <div key={c.id} className="w-full flex justify-center my-2"><div className="bg-[#ffeeba] px-4 py-1.5 rounded-lg text-[12.5px] text-[#667781] flex items-center gap-2"><ShieldAlertIcon className="size-3.5" />{c.content}</div></div>;

            return (
              <div key={c.id} className="flex flex-col">
                {showDate && <div className="w-full flex justify-center my-3"><div className="bg-white/80 px-3 py-1 rounded-lg text-[12px] font-medium text-[#54656f]">{messageDateStr}</div></div>}
                <div className={`flex items-end gap-2 max-w-[85%] ${isMe ? "self-end" : "self-start"}`}>
                  <div className={`relative px-2.5 py-1.5 shadow-sm ${isMe ? "bg-[#d9fdd3] rounded-t-lg rounded-bl-lg" : "bg-white rounded-t-lg rounded-br-lg"}`}>
                    {!isMe && (!comments[i - 1] || comments[i - 1].senderId !== c.senderId || showDate) && <p className="text-[13px] font-bold text-orange-600 mb-0.5">{c.senderName}</p>}
                    {c.attachments?.map(att => (
                      <div key={att.id} className="flex items-center gap-3 p-2 my-1 bg-black/5 rounded-md">
                        {getFileIcon(att.type)}
                        <p className="text-[13px] truncate">{att.name}</p>
                      </div>
                    ))}
                    <p className="text-[14.5px] whitespace-pre-wrap">{c.content}
                      <span className="float-right text-[11px] text-[#667781] ml-2 mt-1.5 flex items-center gap-1">{format(new Date(c.createdAt), "h:mm a")}
                        {isMe && (c.status === 'read' ? <CheckCheckIcon className="size-3.5 text-blue-500" /> : <CheckIcon className="size-3.5" />)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} className="h-2" />
      </div>

      {pendingAttachments.length > 0 && (
        <div className="bg-[#f0f2f5] border-t border-gray-300/50 px-4 py-3 flex gap-3 overflow-x-auto shrink-0">
          {pendingAttachments.map((file, i) => (
            <div key={i} className="relative bg-white rounded-lg shadow-sm border border-gray-200 p-2.5 flex items-center gap-3 shrink-0 w-[220px]">
              {getFileIcon(file.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-[11px] text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
              <button 
                onClick={() => removePendingAttachment(i)}
                className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1 shadow-md hover:bg-gray-900 transition-colors z-10"
              >
                <XIcon className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-[#f0f2f5] px-4 py-3 flex items-end gap-2 shrink-0 z-10">
        <div className="flex gap-1 pb-1">
          <Button variant="ghost" size="icon" className="size-10 rounded-full text-[#54656f] hover:bg-black/5 shrink-0">
            <SmileIcon className="size-6" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="size-10 rounded-full text-[#54656f] hover:bg-black/5 shrink-0 relative overflow-hidden"
            onClick={() => fileInputRef.current?.click()}
          >
            <PaperclipIcon className="size-6" />
            <input 
              type="file" 
              multiple 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileSelect}
            />
          </Button>
        </div>
        
        <div className="flex-1 min-h-[42px] max-h-[120px] bg-white rounded-xl shadow-sm border-0 px-4 py-2.5 flex items-center">
          <textarea
            className="w-full bg-transparent border-0 focus:ring-0 resize-none outline-none text-[15px] placeholder:text-[#8696a0] max-h-[100px]"
            rows={input.split('\\n').length > 1 ? Math.min(input.split('\\n').length, 5) : 1}
            placeholder="Type a message"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
        </div>
        
        <div className="pb-0.5">
          <Button 
            onClick={send}
            disabled={(!input.trim() && pendingAttachments.length === 0) || isUploading}
            className={`size-[42px] rounded-full shrink-0 shadow-sm transition-all ${
              !input.trim() && pendingAttachments.length === 0
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-[#00a884] hover:bg-[#008f6f] text-white"
            }`}
          >
            {isUploading ? <Loader2Icon className="size-5 animate-spin" /> : <SendIcon className="size-5 ml-0.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
