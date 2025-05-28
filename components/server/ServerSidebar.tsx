// components/server/ServerSidebar.tsx
import { cookies } from "next/headers"; // Do pobrania tokena
import Link from "next/link"; // Jeśli chcesz, aby serwery były linkami
// Importy typów i innych komponentów
import { UserData, Server, Channel } from "../../frontend/lib/types"; // Dostosuj ścieżkę
import {
  fetchUserServers,
  fetchChannelsForServer,
} from "../../frontend/lib/services/serverService"; // Dostosuj ścieżkę
import LogoutButton from "../auth/LogoutButton";
import AddServerControl from "./AddServerControl";
import { Hash, Mic } from "lucide-react";

// components/server/ServerSidebar.tsx
// ... (poprawione importy jak wyżej) ...

interface ServerSidebarProps {
  userData: UserData;
  activeChannelId?: string | null | undefined;
  activeServerId?: string | null | undefined;
}

export default async function ServerSidebar({
  userData,
  activeChannelId,
  activeServerId,
}: ServerSidebarProps) {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;

  let userServers: Server[] = [];
  let channelsForActiveServer: Channel[] = [];
  let currentServerName = "Wybierz serwer";

  if (token) {
    userServers = await fetchUserServers(token);

    if (activeServerId) {
      const serverIdToFetch = activeServerId.toString();
      console.log(
        `[ServerSidebar] Aktywny serverId: ${serverIdToFetch}, pobieram jego kanały...`
      );
      channelsForActiveServer = await fetchChannelsForServer(
        serverIdToFetch,
        token
      );

      const currentActiveServerDetails = userServers.find(
        (server) => server.ID.toString() === serverIdToFetch
      );
      if (currentActiveServerDetails) {
        currentServerName = currentActiveServerDetails.Name;
      } else {
        currentServerName = "Nieznany Serwer";
      }
    } else if (userServers.length > 0) {
      currentServerName = userServers[0].Name;
      // Opcjonalnie: załaduj kanały dla pierwszego serwera, jeśli żaden nie jest aktywny
      // channelsForActiveServer = await fetchChannelsForServer(userServers[0].ID.toString(), token);
    }
  } else {
    console.warn("ServerSidebar: No auth token found.");
  }

  // Konwersja activeChannelId na liczbę do porównań
  let numericActiveChannelId: number | null = null;
  if (activeChannelId !== null && activeChannelId !== undefined) {
    const parsedId = parseInt(activeChannelId, 10);
    if (!isNaN(parsedId)) {
      numericActiveChannelId = parsedId;
    }
  }

  return (
    <div className="flex h-full">
      {/* Pasek Serwerów */}
      <div className="w-20 bg-gray-900 p-3 space-y-3 flex flex-col items-center border-r border-gray-700 shrink-0">
        <Link href="/home" passHref legacyBehavior>
          <a
            className="w-12 h-12 mb-2 bg-blue-600 rounded-full ..."
            title="Home / Direct Messages"
          >
            DM
          </a>
        </Link>
        <div className="w-full border-t border-gray-700 my-2"></div>
        {userServers.map((server) => {
          const isActiveServer = activeServerId === server.ID.toString();
          return (
            <Link
              key={server.ID}
              href={`/home?serverId=${server.ID}`}
              passHref
              legacyBehavior
            >
              <a
                title={server.Name}
                className={`w-12 h-12 bg-gray-700 ... ${
                  isActiveServer
                    ? "rounded-2xl bg-blue-600"
                    : "rounded-full hover:rounded-2xl hover:bg-blue-600"
                }`}
              >
                {isActiveServer && (
                  <span className="absolute left-0 ..."></span>
                )}
                {server.Name.substring(0, 2).toUpperCase()}
              </a>
            </Link>
          );
        })}
        <AddServerControl />
      </div>

      {/* Panel Kanałów i Użytkownika */}
      <div className="flex-1 flex flex-col bg-gray-800 text-gray-200 overflow-hidden">
        <div className="p-4 h-16 flex items-center border-b border-gray-700 shadow-md shrink-0">
          <h1 className="text-lg font-semibold text-white truncate">
            {currentServerName}
          </h1>
        </div>
        <nav className="flex-grow p-3 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
          {/* BEZPOŚREDNIE WYŚWIETLANIE KANAŁÓW */}
          {channelsForActiveServer.length > 0 ? (
            channelsForActiveServer.map((channel: Channel) => {
              const isActiveChannel = numericActiveChannelId === channel.ID;
              const channelHref = `/home/channels/${channel.ID}?serverId=${
                activeServerId || ""
              }`;
              return (
                <Link
                  key={channel.ID}
                  href={channelHref}
                  passHref
                  legacyBehavior
                >
                  <a
                    className={`
                      group flex items-center rounded-md px-2.5 py-1.5 text-sm font-medium
                      transition-colors duration-100 ease-in-out
                      ${
                        isActiveChannel
                          ? "bg-gray-700 text-white"
                          : "text-gray-400 hover:text-gray-100 hover:bg-gray-700/[0.5]"
                      }
                    `}
                  >
                    {channel.Type === "text" ? (
                      <Hash className="w-5 h-5 mr-1.5 text-gray-500 group-hover:text-gray-400" />
                    ) : (
                      <Mic className="w-5 h-5 mr-1.5 text-gray-500 group-hover:text-gray-400" />
                    )}
                    <span className="truncate flex-1">{channel.Name}</span>
                  </a>
                </Link>
              );
            })
          ) : (
            <p className="text-gray-400 px-2 text-sm">
              {activeServerId
                ? "Brak kanałów na tym serwerze."
                : "Wybierz serwer."}
            </p>
          )}
        </nav>
        {/* Panel Użytkownika */}
        <div className="p-3 h-20 bg-gray-900 border-t border-gray-700 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 overflow-hidden">
            <div className="w-9 h-9 bg-gray-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
              {userData.username.substring(0, 1).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">
                {userData.username}
              </p>
              <p className="text-xs text-gray-400 truncate">
                ID: {userData.user_id}
              </p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
