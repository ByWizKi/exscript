# Spec : Gestionnaire de Prompts IA

**Date :** 2026-06-03  
**Statut :** À implémenter  
**Contexte :** Ajout d'une bibliothèque de prompts génériques dans ExScript, basée sur l'analyse des projets GAS Extia-Inge existants.

---

## Problème

Les utilisateurs posent souvent les mêmes types de demandes de modification aux projets GAS (ajouter une colonne, propager dans un email, modifier un onglet). Sans aide, ils formulent ces demandes de façon vague et le LLM manque de contexte. Un gestionnaire de prompts pré-remplis guidés accélère la saisie et améliore la qualité des résultats.

---

## Objectif

Proposer à l'utilisateur une liste de prompts types cliquables dans le chat IA. En cliquant sur un prompt, le champ de saisie se pré-remplit avec un texte générique paramétrable que l'utilisateur complète avant d'envoyer.

---

## Prompts génériques identifiés

Analyse basée sur les projets : ExDeclarationCommercial, ExTrackMission, ExTrackMentoring, ExTrackCareer, ExSatisfyTelco, ExFeedback, ExRef, ExAO, ExDPE.

### 1. Ajouter une question de formulaire et la propager
```
J'ai ajouté une question "[LABEL DE LA QUESTION]" dans le formulaire Google.
Récupère cette réponse depuis namedValues, stocke-la dans le Google Sheet
dans l'onglet [NOM DE L'ONGLET] à la colonne [NOM OU POSITION], et inclus
cette valeur dans l'email de type [TYPE D'EMAIL].
```

### 2. Ajouter une colonne dans un onglet Google Sheets
```
Ajoute une colonne "[NOM DE LA COLONNE]" dans l'onglet [NOM DE L'ONGLET]
à la position [LETTRE OU INDEX]. Mets à jour le script pour écrire la valeur
[SOURCE DE LA VALEUR] dans cette colonne à chaque traitement.
```

### 3. Supprimer une question ou une colonne
```
Supprime la question "[LABEL]" du traitement dans le script.
Retire la valeur de l'onglet [NOM DE L'ONGLET] et de l'email [TYPE D'EMAIL].
Ne supprime pas la colonne du Google Sheet, laisse-la vide.
```

### 4. Modifier le contenu d'un email
```
Dans l'email de type [TYPE D'EMAIL], modifie [CE QUI CHANGE] :
remplace [ANCIEN TEXTE / VARIABLE] par [NOUVEAU TEXTE / VARIABLE].
Conserve le style HTML et les couleurs existants.
```

### 5. Ajouter un nouveau destinataire à un email
```
Ajoute [ADRESSE EMAIL ou SOURCE DYNAMIQUE] en destinataire (To / CC / BCC)
de l'email de type [TYPE D'EMAIL] lorsque [CONDITION].
```

### 6. Ajouter un nouveau type d'email
```
Crée un nouvel email de type "[NOM]" envoyé à [DESTINATAIRES] quand [CONDITION].
Le contenu doit inclure : [LISTE DES INFORMATIONS].
Ajoute une fonction de test dans le menu du Google Sheet.
```

### 7. Modifier une règle de déclenchement
```
Change la condition qui déclenche [ACTION] : au lieu de [ANCIENNE CONDITION],
déclenche quand [NOUVELLE CONDITION].
```

### 8. Ajouter une entrée dans le menu de test
```
Ajoute une entrée "[LABEL]" dans le menu Google Sheet qui appelle
la fonction de test [NOM FONCTION] avec des données fictives.
```

### 9. Modifier un circuit email (Config)
```
Dans la configuration, modifie le circuit "[NOM DU CIRCUIT]" :
[AJOUTER / RETIRER / REMPLACER] l'adresse [EMAIL] en [To / CC / BCC].
```

### 10. Ajouter un archivage ou une règle de statut
```
Quand la ligne de l'onglet [NOM] a le statut "[STATUT]", déplace-la
vers l'onglet d'archive "[NOM ARCHIVE]" et efface la ligne originale.
```

---

## Design UI

- Bouton "Prompts types" dans la barre du chat IA (à côté du champ de saisie)
- Au clic : panneau ou dropdown avec la liste des 10 prompts groupés par catégorie
- Clic sur un prompt → pré-remplit le champ de saisie, curseur positionné sur le premier `[PARAMÈTRE]`
- L'utilisateur remplace les `[PARAMÈTRES]` et envoie

## Stockage

Les prompts sont définis en dur dans le frontend (pas de gestion côté serveur pour l'instant). Une évolution future pourrait permettre de personnaliser les prompts par projet.

## Fichiers à créer/modifier

- `frontend/src/app/(app)/scripts/_detail/components/PromptLibrary.tsx` — composant liste des prompts
- `frontend/src/app/(app)/scripts/_detail/data/promptTemplates.ts` — données des prompts
- `frontend/src/app/(app)/scripts/[id]/components/AiChat.tsx` — intégrer le bouton d'ouverture
- `frontend/src/app/(app)/scripts/[id]/page.tsx` — passer le handler de sélection de prompt

## Ce qui n'est PAS dans ce scope

- Gestion backend des prompts
- Personnalisation par projet
- Prompts dynamiques générés par l'IA
