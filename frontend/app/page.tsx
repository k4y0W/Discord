// frontend/app/page.tsx
import { cookies } from "next/headers"; // This is for reading incoming cookies
import { redirect } from "next/navigation";

export default function RootPage() {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (token) {
    redirect("/home");
  } else {
    redirect("/login");
  }
  return null;
}
