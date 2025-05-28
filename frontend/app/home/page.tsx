// app/home/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import axios from "axios"; // Potrzebne dla getUserData

// Upewnij się, że ścieżki są poprawne dla Twojej struktury
import { UserData } from "../../lib/types"; // Zakładając, że lib jest na poziomie głównym projektu
import ServerSidebar from "../../../components/server/ServerSidebar"; // Zakładając, że components jest na poziomie głównym

// Użyj NEXT_PUBLIC_ jeśli ta zmienna ma być dostępna też po stronie klienta w przyszłości
// lub jeśli używasz jej w funkcjach, które mogą być wywoływane z różnych kontekstów.
const GO_BACKEND_URL =
  process.env.NEXT_PUBLIC_GO_BACKEND_URL || process.env.GO_BACKEND_URL;

// Funkcja do pobierania danych użytkownika (można ją przenieść do lib/services/userService.ts)
async function getUserData(token: string): Promise<UserData | null> {
  if (!GO_BACKEND_URL) {
    console.error("[HomePage] GO_BACKEND_URL is not set for getUserData");
    return null;
  }
  try {
    const response = await axios.get<UserData>(`${GO_BACKEND_URL}/home`, {
      // Endpoint Go do pobierania danych użytkownika
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error: any) {
    console.error(
      "[HomePage] Failed to fetch user data:",
      error.response?.data?.error || error.message
    );
    return null;
  }
}

// Interfejs propsów dla strony, aby mogła odbierać searchParams
interface HomePageProps {
  searchParams?: {
    serverId?: string;
    channelId?: string;
    error?: string;
    channelIdAttempt?: string; // <<< DODAJ TO POLE
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
    // Jeśli nie udało się pobrać danych użytkownika (np. token wygasł po stronie backendu)
    cookieStore.set("auth_token", "", {
      // Wyczyść niepoprawny token
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
      expires: new Date(0),
    });
    redirect("/login?error=session_expired_home");
    return null;
  }

  // Odczytaj activeServerId i activeChannelId z URL (searchParams)
  const activeServerId = searchParams?.serverId || null;
  const activeChannelIdQuery = searchParams?.channelId; // Może być stringiem lub undefined
  const activeChannelId = Array.isArray(activeChannelIdQuery)
    ? activeChannelIdQuery[0]
    : activeChannelIdQuery || null;

  // Komunikat o błędzie z URL (np. po nieudanym przekierowaniu z ChannelPage)
  const errorMessage = searchParams?.error;

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      <div className="flex flex-shrink-0">
        {" "}
        {/* Sidebar sam zarządza swoją szerokością */}
        <ServerSidebar
          userData={userData}
          activeChannelId={activeChannelId} // Przekazujemy ID aktywnego kanału (jeśli jest w URL)
          activeServerId={activeServerId} // Przekazujemy ID aktywnego serwera
        />
      </div>

      {/* Główna treść strony /home */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-800">
        <div className="text-center">
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-500 text-white rounded-md">
              {errorMessage === "channel_not_found" &&
                `Nie znaleziono kanału (ID próby: ${
                  searchParams?.channelIdAttempt || "nieznane"
                }).`}
              {/* Dodaj inne obsługiwane komunikaty o błędach */}
            </div>
          )}

          {!activeServerId && (
            <>
              <h1 className="text-4xl font-bold mb-4 text-white">
                Witaj, {userData.username}!
              </h1>
              <p className="text-xl text-gray-300">
                Wybierz serwer z panelu po lewej, aby rozpocząć.
              </p>
              <p className="text-gray-400 mt-2">
                Możesz także utworzyć nowy serwer, klikając przycisk "+" w
                panelu serwerów.
              </p>
            </>
          )}

          {activeServerId && !activeChannelId && (
            <>
              <h1 className="text-4xl font-bold mb-4 text-white">
                Serwer wybrany!{" "}
                {/* TODO: Można tu dodać nazwę aktywnego serwera */}
              </h1>
              <p className="text-xl text-gray-300">
                Wybierz kanał z listy, aby dołączyć do rozmowy.
              </p>
            </>
          )}

          {/* 
            Jeśli URL to /home/channels/[channelId], to ta strona (/home/page.tsx) nie będzie renderowana,
            tylko strona app/home/channels/[channelId]/page.tsx.
            Dlatego nie ma potrzeby tutaj renderować listy kanałów dla aktywnego serwera,
            bo ServerSidebar już to robi i nawiguje do strony konkretnego kanału.
            Ta główna sekcja na /home może służyć jako miejsce powitalne lub do wyświetlania
            jakichś ogólnych informacji/aktywności, jeśli nie jest wybrany konkretny kanał.
          */}
        </div>
      </main>
    </div>
  );
}
