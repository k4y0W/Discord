import { NextResponse } from "next/server";
import axios from "axios";

const GO_BACKEND_URL = process.env.GO_BACKEND_URL;

export async function POST(request: Request) {
  if (!GO_BACKEND_URL) {
    console.error("GO_BACKEND_URL is not set");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }
  try {
    const body = await request.json();
    const { username, email, password } = body;

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Username, email, and password are required" },
        { status: 400 }
      );
    }

    const goResponse = await axios.post(`${GO_BACKEND_URL}/addUser`, body);
    return NextResponse.json(goResponse.data, { status: goResponse.status });
  } catch (error: any) {
    console.error(
      "Register API route error:",
      error.response?.data || error.message
    );
    const statusCode = error.response?.status || 500;
    const message = error.response?.data?.error || "Failed to register.";
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
