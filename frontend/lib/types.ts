// frontend/lib/types.ts

export interface ServerMember {
  ID: number;
  Username: string;
  //Status: string;
}

export interface Message {
  ID: number;
  Content: string;
  CreatedAt: string;
  UserID: number;
  User?: UserData;
  ChannelID: number;
}

export interface Server {
  ID: number; // Zgodnie z `gorm:"primaryKey"`
  Name: string; // Zgodnie z `gorm:"not null"`
  CreatedAt: string; // Data jako string (np. ISO 8601)
  OwnerID: number; // Zgodnie z `gorm:"not null"`
  Owner?: ServerMember; // Właściciel serwera (opcjonalne, jeśli nie zawsze jest preładowywany)
  Members?: ServerMember[]; // Lista członków serwera (opcjonalne, jeśli nie zawsze jest preładowywana)
  Channels?: Channel[]; // Lista kanałów na serwerze (opcjonalne, jeśli nie zawsze jest preładowywana)
}
export interface UserData {
  username: string;
  message: string; // Welcome message from backend
  user_id: number | string;
}

export interface Channel {
  ID: number; // PascalCase
  Name: string; // PascalCase
  Type: "text" | "voice";
  ServerID: number; // PascalCase
  CreatedAt: string; // PascalCase (zakładając, że Go tak serializuje time.Time)
  active?: boolean;
  unread?: boolean;
}

export interface ChannelCategory {
  id: string;
  Name: string;
  channels: Channel[];
}
