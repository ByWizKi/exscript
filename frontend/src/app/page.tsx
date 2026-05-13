import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <main className="min-h-screen bg-extia-night flex items-center justify-center">
      <div className="text-center">
        <h1 className="font-mont text-extia-yellow text-3xl mb-4">ExScript</h1>
        <p className="text-white text-sm">
          Bienvenue,{" "}
          <span className="text-extia-yellow font-semibold">
            {session.user?.name}
          </span>
        </p>
        <p className="text-extia-blue-light/60 text-xs mt-2">{session.user?.email}</p>
      </div>
    </main>
  );
}
