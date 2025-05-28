// lib/services/serverService.ts
import axios from "axios";
// POPRAWIONY IMPORT - upewnij się, że ścieżka jest poprawna
import { Server, Channel } from "../types"; // Zakładając, że types.ts jest w lib/

const GO_BACKEND_URL =
  process.env.NEXT_PUBLIC_GO_BACKEND_URL || process.env.GO_BACKEND_URL;

interface GetUserServersResponse {
  servers: Server[]; // Używa zaimportowanego typu Server
}

interface GetServerChannelsResponse {
  channels: Channel[]; // Używa zaimportowanego typu Channel
}

export async function fetchUserServers(token: string): Promise<Server[]> {
  if (!GO_BACKEND_URL) {
    console.error("GO_BACKEND_URL is not set for fetchUserServers");
    return [];
  }
  if (!token) {
    console.error("No token provided for fetchUserServers");
    return [];
  }

  try {
    const response = await axios.get<GetUserServersResponse>(
      `${GO_BACKEND_URL}/api/servers`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data.servers || [];
  } catch (error: any) {
    console.error(
      "Failed to fetch user servers:",
      error.response?.data?.error || error.message
    );
    return [];
  }
}

export async function fetchChannelsForServer(
  serverId: string,
  token: string
): Promise<Channel[]> {
  if (!GO_BACKEND_URL) {
    console.error("GO_BACKEND_URL is not set for fetchChannelsForServer");
    return [];
  }
  if (!token) {
    console.error("No token provided for fetchChannelsForServer");
    return [];
  }
  if (!serverId) {
    console.error("No serverId provided for fetchChannelsForServer");
    return [];
  }

  try {
    const response = await axios.get<GetServerChannelsResponse>(
      `${GO_BACKEND_URL}/api/servers/${serverId}/channels`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data.channels || [];
  } catch (error: any) {
    console.error(
      `Failed to fetch channels for server ${serverId}:`,
      error.response?.data?.error || error.message
    );
    return [];
  }
}
