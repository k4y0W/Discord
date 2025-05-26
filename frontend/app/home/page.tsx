// app/home/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import axios from "axios";
// Upewnij się, że ścieżki są poprawne dla Twojej struktury
import { UserData, Channel, Server } from "../../lib/types"; // Dodano Server, jeśli będziesz go tu potrzebować
import ServerSidebar from "../../../components/server/ServerSidebar";
// import CreateServerForm from "../../../components/server/CreateServerForm"; // Odkomentuj, jeśli chcesz go tu używać

// Użyj NEXT_PUBLIC_ jeśli ta zmienna ma być dostępna też po stronie klienta w przyszłości
const GO_BACKEND_URL =
  process.env.NEXT_PUBLIC_GO_BACKEND_URL || process.env.GO_BACKEND_URL;

// Zmodyfikowana funkcja, aby potencjalnie przyjmowała serverId
async function getAvailableChannels(
  token: string,
  serverId?: string | null
): Promise<Channel[]> {
  if (!GO_BACKEND_URL) {
    console.error("GO_BACKEND_URL is not set for getAvailableChannels");
    return [];
  }
  if (!token) {
    console.error("No token for getAvailableChannels");
    return [];
  }

  let apiUrl = `${GO_BACKEND_URL}/api/channels`; // Domyślnie pobiera wszystkie kanały (jak wcześniej)

  if (serverId) {
    // Jeśli serverId jest podane, zmień URL, aby pobrać kanały dla tego serwera
    // To jest endpoint, który musisz stworzyć w Go: GET /api/servers/{serverId}/channels
    apiUrl = `${GO_BACKEND_URL}/api/servers/${serverId}/channels`;
    console.log(`Fetching channels for serverId: ${serverId} from ${apiUrl}`);
  } else {
    console.log(`Fetching all available channels from ${apiUrl}`);
  }

  try {
    // Backend dla /api/servers/{serverId}/channels powinien zwracać { channels: Channel[] }
    // lub bezpośrednio Channel[] - dostosuj typ odpowiedzi axiosa
    const response = await axios.get<{ channels: Channel[] }>(apiUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.data && Array.isArray(response.data.channels)) {
      return response.data.channels;
    } else if (Array.isArray(response.data)) {
      // Jeśli API zwraca bezpośrednio tablicę kanałów
      // To jest bardziej prawdopodobne dla endpointu /api/servers/{serverId}/channels
      // Sprawdź, co faktycznie zwraca Twoje API Go
      // @ts-ignore // Tymczasowe ignorowanie błędu typu, jeśli odpowiedź to Channel[]
      return response.data as Channel[];
    } else {
      console.error(
        "Unexpected response structure from channels API:",
        response.data
      );
      return [];
    }
  } catch (error: any) {
    console.error(
      `Failed to fetch channels (serverId: ${serverId || "all"}):`,
      error.response?.data?.error || error.message
    );
    return [];
  }
}

async function getUserData(token: string): Promise<UserData | null> {
  if (!GO_BACKEND_URL) {
    console.error("GO_BACKEND_URL is not set for getUserData");
    return null;
  }
  try {
    const response = await axios.get<UserData>(`${GO_BACKEND_URL}/home`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error: any) {
    console.error(
      "Failed to fetch user data:",
      error.response?.data || error.message
    );
    return null;
  }
}

// Dodajemy searchParams do propsów strony, aby odczytać parametry z URL
interface HomePageProps {
  searchParams?: {
    serverId?: string; // Oczekujemy serverId jako string
    // Możesz dodać inne searchParams, jeśli będą potrzebne
  };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    redirect("/login");
  }

  const userData = await getUserData(token);

  if (!userData) {
    cookieStore.set("auth_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
      expires: new Date(0),
    });
    redirect("/login?error=session_expired_home");
    return null;
  }

  // Odczytaj activeServerId z URL (searchParams)
  const activeServerId = searchParams?.serverId || null; // Będzie stringiem lub null

  // Pobierz kanały, przekazując activeServerId
  // Funkcja getAvailableChannels powinna teraz używać tego ID do pobrania odpowiednich kanałów
  const channelsForDisplay = await getAvailableChannels(token, activeServerId);

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      <div className="hidden md:flex w-auto flex-shrink-0">
        {" "}
        {/* w-auto aby sidebar sam zarządzał szerokością */}
        <ServerSidebar
          userData={userData}
          activeChannelId={null} // Na stronie /home nie ma aktywnego kanału czatu
          activeServerId={activeServerId} // Przekaż odczytane activeServerId
        />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-6 overflow-hidden">
        <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-lg text-center">
          {" "}
          {/* Zwiększono max-w-lg */}
          <h1 className="text-3xl font-bold mb-6 text-white">
            Welcome, {userData.username}!
          </h1>
          {/* Możesz tu dodać CreateServerForm, jeśli chcesz go mieć na tej stronie */}
          {/* <div className="mb-6"> <CreateServerForm /> </div> */}
          {activeServerId ? ( // Jeśli serwer jest wybrany, pokaż jego kanały
            <>
              <p className="text-gray-300 mb-4">
                Kanały dla wybranego serwera: {/* TODO: Pokaż nazwę serwera */}
              </p>
              {channelsForDisplay.length > 0 ? (
                <ul className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
                  {" "}
                  {/* Dodano scroll dla listy kanałów */}
                  {channelsForDisplay.map((channel) => (
                    <li key={channel.ID}>
                      <Link
                        // Link do kanału powinien teraz uwzględniać serverId, jeśli Twoja struktura URL tego wymaga
                        // Na razie zakładamy, że /home/channels/:channelId jest unikalne globalnie
                        // lub że ServerSidebar wie, do którego serwera należy aktywny kanał
                        href={`/home/channels/${channel.ID}?serverId=${activeServerId}`} // Przekazujemy serverId dalej
                        className="block w-full px-6 py-3 text-lg font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                      >
                        # {channel.Name}
                        {channel.Type === "voice" && (
                          <span className="ml-2 text-xs opacity-75">
                            (Voice)
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-400">
                  Brak kanałów na tym serwerze lub wybierz inny serwer.
                </p>
              )}
            </>
          ) : (
            // Jeśli żaden serwer nie jest wybrany
            <p className="text-gray-300 mb-8">
              Wybierz serwer z panelu po lewej, aby zobaczyć jego kanały.
            </p>
          )}
          <div className="mt-10">
            <h3 className="text-lg font-semibold text-gray-200">
              Your User Data:
            </h3>
            <pre className="bg-gray-700 p-3 rounded mt-2 text-xs text-left overflow-x-auto text-gray-100">
              {JSON.stringify(userData, null, 2)}
            </pre>
          </div>
        </div>
      </main>
    </div>
  );
}
