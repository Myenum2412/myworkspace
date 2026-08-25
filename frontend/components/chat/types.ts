export interface Participant {
  socketId: string;
  userId: string;
  name: string;
  avatar: string;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: Date | string;
  type: "text" | "system";
}

export interface Room {
  id: string;
  name: string;
  participantCount: number;
  isActive: boolean;
  createdAt: string;
}
