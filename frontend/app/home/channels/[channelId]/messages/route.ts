// app/api/chat/channels/[channelId]/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import axios from "axios";

const GO_BACKEND_URL =
  process.env.NEXT_PUBLIC_GO_BACKEND_URL || process.env.GO_BACKEND_URL;

interface RequestBody {
  content: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { channelId: string } } // Odbieramy channelId z parametrów ścieżki API Route
) {
  if (!GO_BACKEND_URL) {
    return NextResponse.json(
      { error: "Backend URL not configured" },
      { status: 500 }
    );
  }

  const { channelId } = params;
  if (!channelId) {
    return NextResponse.json(
      { error: "Channel ID is missing" },
      { status: 400 }
    );
  }

  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  try {
    const { content } = (await request.json()) as RequestBody;
    if (!content || typeof content !== "string" || content.trim() === "") {
      return NextResponse.json(
        { error: "Treść wiadomości jest wymagana" },
        { status: 400 }
      );
    }

    const goResponse = await axios.post(
      `${GO_BACKEND_URL}/api/channels/${channelId}/messages`, // Endpoint w Go
      { content }, // Wysyłamy tylko treść
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return NextResponse.json(goResponse.data, { status: goResponse.status });
  } catch (error: any) {
    console.error(
      "Błąd w API Route Next.js (/api/chat/.../messages):",
      error.response?.data || error.message
    );
    if (error.response) {
      return NextResponse.json(
        {
          error:
            error.response.data?.error ||
            "Błąd serwera Go podczas wysyłania wiadomości",
        },
        { status: error.response.status || 500 }
      );
    }
    return NextResponse.json(
      { error: "Wewnętrzny błąd serwera podczas wysyłania wiadomości" },
      { status: 500 }
    );
  }
}
