// components/server/ServerSidebar.tsx
import { cookies } from "next/headers"; // Do pobrania tokena
import Link from "next/link"; // Jeśli chcesz, aby serwery były linkami
// Importy typów i innych komponentów
import { UserData, ChannelCategory, Server } from "../../frontend/lib/types"; // Dostosuj ścieżkę
import { fetchUserServers } from "../../frontend/lib/services/serverService"; // Dostosuj ścieżkę
import LogoutButton from "../auth/LogoutButton";
import ChannelCategoryView from "../../frontend/app/home/channels/ChannelCategoryView";
// Mock data dla kanałów - to będzie później dynamiczne per serwer
import { mockChannelData } from "../../frontend/lib/mockData"; // Załóżmy, że przeniosłeś mockChannelData
import AddServerControl from "./AddServerControl";

interface ServerSidebarProps {
  userData: UserData;
  activeChannelId: string | null | undefined; // Może być stringiem z URL lub null
  activeServerId?: string | number | null; // Dodajemy activeServerId, na razie opcjonalny
}

export default async function ServerSidebar({
  userData,
  activeChannelId,
  activeServerId, // Odczytujemy nowy prop
}: ServerSidebarProps) {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;

  let userServers: Server[] = [];
  if (token) {
    userServers = await fetchUserServers(token);
  } else {
    console.warn(
      "ServerSidebar: No auth token found. Server list will be empty."
    );
  }

  // TODO: Logika pobierania kanałów dla activeServerId
  // Na razie, jeśli activeServerId istnieje, próbujemy znaleźć serwer i jego kanały
  // W przeciwnym razie używamy mockChannelData lub pustej tablicy
  let channelsToDisplay: ChannelCategory[] = mockChannelData; // Domyślnie mock
  let currentServerName = "Wybierz serwer";

  if (activeServerId && userServers.length > 0) {
    const currentActiveServer = userServers.find(
      (server) => server.ID.toString() === activeServerId.toString() // Porównujemy jako stringi dla bezpieczeństwa
    );
    if (currentActiveServer) {
      currentServerName = currentActiveServer.Name;
      // TODO: Tutaj powinna być logika pobierania RZECZYWISTYCH kanałów dla currentActiveServer.ID
      // Na przykład: channelsToDisplay = await fetchChannelsForServer(currentActiveServer.ID, token);
      // Na razie, jeśli serwer jest aktywny, możemy np. wyczyścić mockowane kanały,
      // aby zasygnalizować, że powinny być załadowane inne.
      // Dla uproszczenia zostawmy mockChannelData, dopóki nie zaimplementujesz fetchChannelsForServer.
      console.log(`Aktywny serwer: ${currentActiveServer.Name}`);
    }
  } else if (userServers.length > 0) {
    // Jeśli żaden serwer nie jest aktywny, ale są jakieś serwery, weź nazwę pierwszego
    currentServerName = userServers[0].Name;
    // TODO: Załaduj kanały dla tego pierwszego serwera jako domyślne
  }

  return (
    <div className="flex h-full">
      {" "}
      {/* Upewnij się, że komponent nadrzędny daje h-full lub h-screen */}
      {/* Pasek Serwerów */}
      <div className="w-20 bg-gray-900 p-3 space-y-3 flex flex-col items-center border-r border-gray-700 shrink-0">
        <Link href="/home" passHref legacyBehavior>
          <a
            className="w-12 h-12 mb-2 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl hover:bg-blue-500 hover:rounded-xl transition-all duration-200"
            title="Home / Direct Messages"
          >
            DM
          </a>
        </Link>
        <div className="w-full border-t border-gray-700 my-2"></div>{" "}
        {/* Separator */}
        {userServers.map((server) => {
          // Załóżmy, że activeServerId jest przekazywany jako prop do ServerSidebar
          // i jest stringiem (pobranym z searchParams URL)
          const isActiveServer = activeServerId === server.ID.toString();
          return (
            <Link
              key={server.ID}
              href={`/home?serverId=${server.ID}`} // Zmieniamy URL, dodając serverId jako searchParam
              passHref
              legacyBehavior // Jeśli używasz <a> wewnątrz Link dla stylizacji
            >
              <a
                title={server.Name}
                className={`
                  w-12 h-12 bg-gray-700 flex items-center justify-center 
                  text-white font-bold text-lg focus:outline-none
                  transition-all duration-150 ease-in-out group relative
                  ${
                    isActiveServer
                      ? "rounded-2xl bg-blue-600"
                      : "rounded-full hover:rounded-2xl hover:bg-blue-600"
                  }
                `}
              >
                {isActiveServer && (
                  <span className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-full w-1 h-6 bg-white rounded-r-md transition-all duration-200"></span>
                )}
                {server.Name.substring(0, 2).toUpperCase()}
              </a>
            </Link>
          );
        })}
        <AddServerControl /> {/* Komponent kliencki do dodawania serwera */}
      </div>
      {/* Panel Kanałów i Użytkownika */}
      <div className="flex-1 flex flex-col bg-gray-800 text-gray-200 overflow-hidden">
        {" "}
        {/* Dodano overflow-hidden */}
        <div className="p-4 h-16 flex items-center border-b border-gray-700 shadow-md shrink-0">
          <h1 className="text-lg font-semibold text-white truncate">
            {currentServerName}
          </h1>
          {/* TODO: Opcje serwera (rozwijane menu) */}
        </div>
        <nav className="flex-grow p-3 space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
          {channelsToDisplay.length > 0 ? (
            channelsToDisplay.map((category) => (
              <ChannelCategoryView
                key={category.id} // Użyj category.id, jeśli jest unikalne
                category={category}
                activeChannelId={activeChannelId} // Przekazujemy ID aktywnego kanału
              />
            ))
          ) : (
            <p className="text-gray-400 px-2">
              Wybierz serwer, aby zobaczyć kanały lub utwórz nowy.
            </p>
          )}
        </nav>
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
