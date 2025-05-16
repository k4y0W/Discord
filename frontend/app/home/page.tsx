// frontend/app/home/page.tsx
import { cookies } from "next/headers"; // Ensure this is the ONLY cookies import
import { redirect } from "next/navigation";
import axios from "axios";
import LogoutButton from "../../../components/auth/LogoutButton";

const GO_BACKEND_URL = process.env.GO_BACKEND_URL;

interface UserData {
  username: string;
  message: string;
  user_id: number | string;
}

async function getUserData(token: string): Promise<UserData | null> {
  if (!GO_BACKEND_URL) {
    console.error("GO_BACKEND_URL is not set");
    return null;
  }
  try {
    const response = await axios.get<UserData>(`${GO_BACKEND_URL}/home`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error: any) {
    console.error(
      "Failed to fetch user data from Go backend:",
      error.response?.data || error.message
    );
    return null;
  }
}

export default async function HomePage() {
  const cookieStore = cookies(); // This should return a synchronous cookie store object

  // Line 35 from error context (may shift slightly)
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    redirect("/login");
  }

  const userData = await getUserData(token);

  if (!userData) {
    // Line 45 from error context (may shift slightly)
    cookieStore.set("auth_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
      expires: new Date(0),
    });
    redirect("/login?error=session_expired_or_invalid");
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 min-h-screen bg-gray-900 text-white p-4">
      <div className="md:col-span-1 p-6 bg-gray-800 border border-gray-700 rounded-lg shadow-md flex flex-col">
        <div>
          <h2 className="text-xl font-bold mb-4">Channels</h2>
          <p className="text-gray-400 text-sm">User ID: {userData.user_id}</p>
          <p className="text-gray-400 text-sm">Username: {userData.username}</p>
        </div>
        <div className="mt-auto pt-4">
          <LogoutButton />
        </div>
      </div>
      <div className="md:col-span-3 p-6 bg-gray-800 border border-gray-700 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-6">Home Page</h1>
        <p className="text-gray-300 mb-6">{userData.message}</p>
        <div className="mt-8">
          <h3 className="text-xl font-semibold">
            Your User Data (Fetched by Next.js Server):
          </h3>
          <pre className="bg-gray-700 p-4 rounded mt-2 text-sm overflow-x-auto">
            {JSON.stringify(userData, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
