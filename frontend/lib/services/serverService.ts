import axios from "axios";
import { Server } from "../types"; // Importuj typ Server

const GO_BACKEND_URL = process.env.GO_BACKEND_URL;

interface GetUserServersResponse {
  servers: Server[];
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
