import { ChannelCategory } from "./types";

export const mockChannelData: ChannelCategory[] = [
  {
    id: "cat1",
    Name: "TEXT CHANNELS",
    channels: [
      {
        ID: 1,
        Name: "general",
        Type: "text",
        ServerID: 1,
        CreatedAt: new Date().toISOString(),
        active: true,
        unread: true,
      },
      {
        ID: 2,
        Name: "random",
        Type: "text",
        ServerID: 1,
        CreatedAt: new Date().toISOString(),
      },
    ],
  },
  {
    id: "cat2",
    Name: "VOICE CHANNELS",
    channels: [
      {
        ID: 3,
        Name: "Lounge",
        Type: "voice",
        ServerID: 1,
        CreatedAt: new Date().toISOString(),
      },
    ],
  },
];
