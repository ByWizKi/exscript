import { Play, FileSpreadsheet, GitBranch } from "lucide-react";

const TUTORIALS = [
  {
    id: 1,
    title: "Ajouter un projet Google Sheets",
    description: "Découvrez comment connecter une feuille Google Sheets avec son Apps Script et l'importer dans ExScript.",
    duration: "~2 min",
    icon: FileSpreadsheet,
    iconBg: "bg-green-50 dark:bg-green-500/10",
    iconColor: "text-green-600 dark:text-green-400",
    // Remplace null par l'URL de la vidéo quand elle est prête
    videoUrl: null as string | null,
  },
  {
    id: 2,
    title: "Modifier un script avec l'IA",
    description: "Apprenez à demander une modification de code à l'IA, prévisualiser les changements et créer une nouvelle version.",
    duration: "~3 min",
    icon: GitBranch,
    iconBg: "bg-blue-50 dark:bg-blue-500/10",
    iconColor: "text-blue-600 dark:text-blue-400",
    // Remplace null par l'URL de la vidéo quand elle est prête
    videoUrl: null as string | null,
  },
];

export default function HomePage() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto pb-24">

        {/* Header */}
        <div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight">
            <span className="text-extia-yellow">Ex</span>Script
          </h1>
          <p className="text-sm text-slate-500 dark:text-white/40 mt-1">
            Bienvenue sur le configurateur Google Apps Script.
          </p>
        </div>

        {/* Tutorials */}
        <div>
          <h2 className="font-heading font-bold text-base text-slate-900 dark:text-white mb-3">
            Tutoriels
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TUTORIALS.map((tuto) => {
              const Icon = tuto.icon;
              return (
                <div
                  key={tuto.id}
                  className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden flex flex-col"
                >
                  {/* Video area */}
                  <div className="relative aspect-video bg-slate-100 dark:bg-white/[0.03] flex items-center justify-center">
                    {tuto.videoUrl ? (
                      <video
                        src={tuto.videoUrl}
                        controls
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-3 text-center px-6">
                        <div className="w-14 h-14 rounded-2xl bg-slate-200 dark:bg-white/[0.06] flex items-center justify-center">
                          <Play className="w-6 h-6 text-slate-400 dark:text-white/30 ml-0.5" />
                        </div>
                        <p className="text-xs text-slate-400 dark:text-white/25 font-medium">
                          Vidéo à venir
                        </p>
                      </div>
                    )}
                    {/* Numéro du tuto */}
                    <span className="absolute top-3 left-3 bg-extia-yellow text-extia-night text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Tuto {tuto.id}
                    </span>
                    {/* Durée */}
                    <span className="absolute top-3 right-3 bg-black/40 dark:bg-black/50 text-white text-[10px] font-medium px-2 py-0.5 rounded-full backdrop-blur-sm">
                      {tuto.duration}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="p-4 flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tuto.iconBg}`}>
                      <Icon className={`w-4 h-4 ${tuto.iconColor}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                        {tuto.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-white/40 mt-1 leading-relaxed">
                        {tuto.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
