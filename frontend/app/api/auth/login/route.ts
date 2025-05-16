// frontend/app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import axios from "axios";
import { cookies, ReadonlyRequestCookies } from "next/headers"; // MODIFIED: Import ReadonlyRequestCookies

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
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const goResponse = await axios.post(`${GO_BACKEND_URL}/login`, body);

    if (goResponse.data.token) {
      // MODIFIED: Explicitly type cookieStore
      const cookieStore: ReadonlyRequestCookies = cookies();

      // Now check if 'cookieStore.set' still shows an error.
      // If 'set' is not part of ReadonlyRequestCookies, we have a different problem.
      // However, the standard API also allows setting on the response via cookies() in Route Handlers.
      // Let's try the direct response manipulation for setting cookies in Route Handlers,
      // as this is also a valid and common pattern.

      const response = NextResponse.json({
        // Create the response object first
        success: true,
        message: goResponse.data.message || "Logged in successfully",
      });

      // Set the cookie on the response object
      response.cookies.set("auth_token", goResponse.data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });

      return response; // Return the modified response
    } else {
      return NextResponse.json(
        { error: "Login failed: No token received from backend" },
        { status: goResponse.status || 500 }
      );
    }
  } catch (error: any) {
    console.error(
      "Login API route error:",
      error.response?.data || error.message
    );
    const statusCode = error.response?.status || 500;
    const message =
      error.response?.data?.error || "Login failed. Please try again.";
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
