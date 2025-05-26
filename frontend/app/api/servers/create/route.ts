// app/api/servers/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import axios from "axios";

const GO_BACKEND_URL = process.env.GO_BACKEND_URL;

export async function POST(request: NextRequest) {
  if (!GO_BACKEND_URL) {
    return NextResponse.json(
      { error: "Backend URL not configured" },
      { status: 500 }
    );
  }

  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  try {
    const { name } = await request.json();
    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "Nazwa serwera jest wymagana" },
        { status: 400 }
      );
    }

    const goResponse = await axios.post(
      `${GO_BACKEND_URL}/api/servers`, // Twój endpoint w Go
      { name },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return NextResponse.json(goResponse.data, { status: goResponse.status });
  } catch (error: any) {
    console.error(
      "Błąd podczas tworzenia serwera (API Route):",
      error.response?.data || error.message
    );
    // Przekaż błąd z Go, jeśli jest dostępny
    if (error.response) {
      return NextResponse.json(
        { error: error.response.data?.error || "Błąd serwera Go" },
        { status: error.response.status || 500 }
      );
    }
    return NextResponse.json(
      { error: "Wewnętrzny błąd serwera podczas tworzenia serwera" },
      { status: 500 }
    );
  }
}
