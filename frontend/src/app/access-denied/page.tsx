import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <main className="min-h-screen bg-extia-night flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-extia-yellow text-6xl mb-6">⚠</div>
        <h1 className="font-mont text-white text-2xl mb-3">Accès refusé</h1>
        <p className="text-extia-blue-light text-sm mb-2">
          Votre compte Google n&apos;est pas autorisé à accéder à cette application.
        </p>
        <p className="text-extia-blue-light/60 text-xs mb-8">
          Seuls les emails{" "}
          <span className="text-extia-yellow">@extia-inge.fr</span> sont acceptés.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 bg-extia-yellow hover:bg-extia-yellow-hover text-extia-night font-bold py-2.5 px-6 rounded-xl transition-colors duration-200 text-sm"
        >
          Retour à la connexion
        </Link>
      </div>
    </main>
  );
}
