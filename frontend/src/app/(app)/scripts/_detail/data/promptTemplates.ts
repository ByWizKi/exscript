export interface PromptTemplate {
  id: string;
  category: string;
  label: string;
  template: string;
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: "add-form-question",
    category: "Formulaire",
    label: "Ajouter une question formulaire",
    template:
      "J'ai ajouté une question \"[LABEL DE LA QUESTION]\" dans le formulaire Google.\nRécupère cette réponse depuis namedValues, stocke-la dans le Google Sheet dans l'onglet [NOM DE L'ONGLET] à la colonne [NOM OU POSITION], et inclus cette valeur dans l'email de type [TYPE D'EMAIL].",
  },
  {
    id: "remove-form-question",
    category: "Formulaire",
    label: "Supprimer une question ou colonne",
    template:
      "Supprime la question \"[LABEL]\" du traitement dans le script. Retire la valeur de l'onglet [NOM DE L'ONGLET] et de l'email [TYPE D'EMAIL]. Ne supprime pas la colonne du Google Sheet, laisse-la vide.",
  },
  {
    id: "add-sheet-column",
    category: "Google Sheets",
    label: "Ajouter une colonne dans un onglet",
    template:
      "Ajoute une colonne \"[NOM DE LA COLONNE]\" dans l'onglet [NOM DE L'ONGLET] à la position [LETTRE OU INDEX]. Mets à jour le script pour écrire la valeur [SOURCE DE LA VALEUR] dans cette colonne à chaque traitement.",
  },
  {
    id: "add-archive-rule",
    category: "Google Sheets",
    label: "Ajouter une règle d'archivage",
    template:
      "Quand la ligne de l'onglet [NOM] a le statut \"[STATUT]\", déplace-la vers l'onglet d'archive \"[NOM ARCHIVE]\" et efface la ligne originale.",
  },
  {
    id: "edit-email-content",
    category: "Email",
    label: "Modifier le contenu d'un email",
    template:
      "Dans l'email de type [TYPE D'EMAIL], modifie [CE QUI CHANGE] : remplace [ANCIEN TEXTE / VARIABLE] par [NOUVEAU TEXTE / VARIABLE]. Conserve le style HTML et les couleurs existants.",
  },
  {
    id: "add-email-recipient",
    category: "Email",
    label: "Ajouter un destinataire à un email",
    template:
      "Ajoute [ADRESSE EMAIL ou SOURCE DYNAMIQUE] en destinataire (To / CC / BCC) de l'email de type [TYPE D'EMAIL] lorsque [CONDITION].",
  },
  {
    id: "new-email-type",
    category: "Email",
    label: "Créer un nouveau type d'email",
    template:
      "Crée un nouvel email de type \"[NOM]\" envoyé à [DESTINATAIRES] quand [CONDITION]. Le contenu doit inclure : [LISTE DES INFORMATIONS]. Ajoute une fonction de test dans le menu du Google Sheet.",
  },
  {
    id: "edit-email-circuit",
    category: "Configuration",
    label: "Modifier un circuit email",
    template:
      "Dans la configuration, modifie le circuit \"[NOM DU CIRCUIT]\" : [AJOUTER / RETIRER / REMPLACER] l'adresse [EMAIL] en [To / CC / BCC].",
  },
  {
    id: "edit-trigger",
    category: "Déclencheurs",
    label: "Modifier une règle de déclenchement",
    template:
      "Change la condition qui déclenche [ACTION] : au lieu de [ANCIENNE CONDITION], déclenche quand [NOUVELLE CONDITION].",
  },
  {
    id: "add-menu-entry",
    category: "Menu / Tests",
    label: "Ajouter une entrée dans le menu de test",
    template:
      "Ajoute une entrée \"[LABEL]\" dans le menu Google Sheet qui appelle la fonction de test [NOM FONCTION] avec des données fictives.",
  },
];

export const PROMPT_CATEGORIES = Array.from(
  new Set(PROMPT_TEMPLATES.map((p) => p.category))
);
