// app/api/servers/[serverId]/channels/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import axios from "axios";

const GO_BACKEND_URL =
  process.env.NEXT_PUBLIC_GO_BACKEND_URL || process.env.GO_BACKEND_URL;

interface RequestBody {
  name: string;
  type: "text" | "voice";
}

export async function POST(
  request: NextRequest,
  { params }: { params: { serverId: string } } // Odbieramy serverId z parametrów ścieżki API Route
) {
  if (!GO_BACKEND_URL) {
    return NextResponse.json(
      { error: "Backend URL not configured" },
      { status: 500 }
    );
  }

  const { serverId } = params;
  if (!serverId) {
    return NextResponse.json(
      { error: "Server ID is missing" },
      { status: 400 }
    );
  }

  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  try {
    const { name, type } = (await request.json()) as RequestBody;
    if (!name || !type || (type !== "text" && type !== "voice")) {
      return NextResponse.json(
        { error: "Nazwa i poprawny typ kanału są wymagane" },
        { status: 400 }
      );
    }

    // Wywołanie endpointu w Go do utworzenia kanału
    const goResponse = await axios.post(
      `${GO_BACKEND_URL}/api/servers/${serverId}/channels`, // Endpoint w Go
      { name, type }, // Dane nowego kanału
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    return NextResponse.json(goResponse.data, { status: goResponse.status });
  } catch (error: any) {
    console.error(
      "Błąd w API Route Next.js (/api/servers/[serverId]/channels/create):",
      error.response?.data || error.message
    );
    if (error.response) {
      return NextResponse.json(
        {
          error:
            error.response.data?.error ||
            "Błąd serwera Go podczas tworzenia kanału",
        },
        { status: error.response.status || 500 }
      );
    }
    return NextResponse.json(
      { error: "Wewnętrzny błąd serwera podczas tworzenia kanału" },
      { status: 500 }
    );
  }
}
