import axios from "axios";

export async function createServer(
  serverName: string,
  token: string
): Promise<any> {
  const response = await axios.post(
    `${process.env.NEXT_PUBLIC_GO_BACKEND_URL}/api/servers`, // Użyj zmiennej środowiskowej dla URL backendu
    { name: serverName },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
}
