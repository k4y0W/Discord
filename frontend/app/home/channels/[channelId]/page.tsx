// app/home/channels/[channelId]/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import axios from "axios";
// Upewnij się, że ścieżki są poprawne dla Twojej struktury
import ServerSidebar from "../../../../../components/server/ServerSidebar"; // Adjust path
import {
  UserData,
  Channel,
  Message as MessageType,
} from "../../../../lib/types"; // Używamy MessageType
import MessageInput from "../../../../../components/chat/MessageInput";
// Użyj NEXT_PUBLIC_ jeśli ta zmienna ma być dostępna też po stronie klienta w przyszłości
const GO_BACKEND_URL =
  process.env.NEXT_PUBLIC_GO_BACKEND_URL || process.env.GO_BACKEND_URL;

// Funkcja do pobierania szczegółów kanału z backendu Go
async function getChannelDetails(
  channelId: string,
  token: string
): Promise<Channel | null> {
  console.log(`[ChannelPage] Fetching REAL details for channel: ${channelId}`);
  if (!GO_BACKEND_URL) {
    console.error("GO_BACKEND_URL is not set for getChannelDetails");
    return null;
  }
  if (!token) {
    console.error("No token for getChannelDetails");
    return null;
  }

  try {
    // Backend Go powinien mieć endpoint GET /api/channels/{channelId}
    const response = await axios.get<{ channel: Channel }>(
      `${GO_BACKEND_URL}/api/channels/${channelId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.channel || null;
  } catch (error: any) {
    console.error(
      `Failed to fetch channel details for ${channelId}:`,
      error.response?.data?.error || error.message
    );
    if (error.response?.status === 404) {
      console.warn(`Channel ${channelId} not found on backend.`);
    }
    return null;
  }
}

// Funkcja do pobierania wiadomości dla kanału z backendu Go
async function getMessagesForChannel(
  channelId: string,
  token: string
): Promise<MessageType[]> {
  console.log(`[ChannelPage] Fetching REAL messages for channel: ${channelId}`);
  if (!GO_BACKEND_URL) {
    console.error("GO_BACKEND_URL is not set for getMessagesForChannel");
    return [];
  }
  if (!token) {
    console.error("No token for getMessagesForChannel");
    return [];
  }

  try {
    // Backend Go powinien mieć endpoint GET /api/channels/{channelId}/messages
    const response = await axios.get<{ messages: MessageType[] }>(
      `${GO_BACKEND_URL}/api/channels/${channelId}/messages`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.messages || [];
  } catch (error: any) {
    console.error(
      `Failed to fetch messages for channel ${channelId}:`,
      error.response?.data?.error || error.message
    );
    return [];
  }
}

// Funkcja do pobierania danych użytkownika (może być w osobnym pliku serwisowym)
async function getUserData(token: string): Promise<UserData | null> {
  if (!GO_BACKEND_URL) {
    console.error("[ChannelPage] GO_BACKEND_URL is not set for getUserData");
    return null;
  }
  try {
    const response = await axios.get<UserData>(`${GO_BACKEND_URL}/home`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error: any) {
    console.error(
      "[ChannelPage] Failed to fetch user data:",
      error.response?.data || error.message
    );
    return null;
  }
}

interface ChannelPageProps {
  params: {
    channelId: string; // channelId z URL zawsze będzie stringiem
  };
  searchParams?: {
    // Dodajemy searchParams, aby odczytać serverId
    serverId?: string;
  };
}

export default async function ChannelPage({
  params,
  searchParams,
}: ChannelPageProps) {
  const { channelId } = params;
  const activeServerId = searchParams?.serverId || null; // Odczytujemy serverId z URL

  console.log(
    `[ChannelPage] Rendering page for channelId: ${channelId}, serverId: ${activeServerId}`
  );

  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    redirect("/login");
  }

  const userData = await getUserData(token);
  if (!userData) {
    cookieStore.set("auth_token", "", { expires: new Date(0), path: "/" });
    redirect("/login?error=session_expired_or_invalid_channel_page");
    return null;
  }

  // Pobieramy szczegóły kanału, przekazując token
  const currentChannel = await getChannelDetails(channelId, token);

  if (!currentChannel) {
    console.warn(
      `[ChannelPage] Channel not found for id: ${channelId}. Redirecting to /home.`
    );
    redirect(
      `/home?serverId=${
        activeServerId || ""
      }&error=channel_not_found&channelIdAttempt=${channelId}`
    );
    return null;
  }

  const messages = await getMessagesForChannel(channelId, token);
  const channelName = currentChannel.Name;

  // Upewnij się, że ServerSidebar poprawnie obsługuje activeChannelId jako string lub number
  // currentChannel.ID jest number, channelId z params jest string.
  // Jeśli ServerSidebar oczekuje stringa:
  const activeChannelIdForSidebar = currentChannel.ID.toString(); // String
  const activeServerIdFromUrl = searchParams?.serverId || null; // String or null
  return (
    <div className="flex h-screen bg-gray-950 text-white">
      <div className="hidden md:flex w-auto flex-shrink-0">
        {" "}
        {/* w-auto dla paska serwerów */}
        <ServerSidebar
          userData={userData}
          activeChannelId={activeChannelIdForSidebar}
          activeServerId={activeServerIdFromUrl}
        />
      </div>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-gray-800 h-16 flex-shrink-0 px-6 flex items-center shadow-md border-b border-gray-700">
          <div className="flex items-center">
            {currentChannel.Type === "text" && (
              <svg /* Ikona kanału tekstowego */
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="w-6 h-6 text-gray-400 mr-2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.5 8.25h9m-9 3H12m-6.375 3h9M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z"
                />
              </svg>
            )}
            {/* TODO: Dodać ikonę dla kanału głosowego, jeśli currentChannel.Type === "voice" */}
            <h1 className="text-xl font-semibold text-white">{channelName}</h1>
          </div>
          {/* TODO: Inne elementy nagłówka: temat kanału, przypięte wiadomości, lista członków itp. */}
        </header>

        <div className="flex-1 flex flex-col bg-gray-800 overflow-hidden">
          <div className="flex-1 p-6 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
            {messages.length > 0 ? (
              messages.map((msg: MessageType) => (
                <div
                  key={msg.ID}
                  className="p-3 bg-gray-700/60 rounded-lg shadow"
                >
                  <div className="flex items-center mb-1">
                    <strong className="text-white mr-2">
                      {/* Backend musi preloadować User dla Message (msg.User) */}
                      {msg.User?.username || `Użytkownik ${msg.UserID}`}
                    </strong>
                    <span className="text-xs text-gray-400">
                      {new Date(msg.CreatedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-gray-200 whitespace-pre-wrap">
                    {msg.Content}
                  </p>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <svg
                  className="w-16 h-16 text-gray-500 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5V16z"
                  />
                </svg>
                <p className="text-gray-400 text-lg">
                  Brak wiadomości w #{channelName}.
                </p>
                <p className="text-gray-500">Napisz pierwszą wiadomość!</p>
              </div>
            )}
          </div>

          <footer className="bg-gray-800 p-0 border-t border-gray-700 flex-shrink-0">
            {" "}
            {/* Usunięto p-4 z footera, bo MessageInput ma własny padding */}
            <MessageInput channelId={channelId} channelName={channelName} />
          </footer>
        </div>
      </main>
    </div>
  );
}
