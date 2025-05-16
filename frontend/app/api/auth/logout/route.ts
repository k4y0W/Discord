// frontend/app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
// No need to import `cookies` from `next/headers` if using `response.cookies.set()`

export async function POST(request: Request) {
  try {
    const response = NextResponse.json({
      success: true,
      message: "Logged out",
    });

    response.cookies.set("auth_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
      expires: new Date(0),
    });

    return response;
  } catch (error) {
    console.error("Logout API error:", error);
    // If an error occurs before response is created, craft a new one
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
