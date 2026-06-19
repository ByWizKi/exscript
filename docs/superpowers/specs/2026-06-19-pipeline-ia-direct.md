# Spec — Pipeline IA direct (Option A)

**Date :** 2026-06-19
**Statut :** Approuvé

---

## Contexte

Le pipeline actuel comporte deux étapes séquentielles :
1. `/ai-clarify` — classification de la demande, reformulation, demande de confirmation
2. `/ai-modify-stream` — modification effective avec boucle agentique de validation (3 tentatives)

Ce pipeline est trop contraignant : le LLM est sur-contraint par des règles de classification, et la friction de confirmation ralentit l'utilisateur sans apporter de valeur réelle. Le résultat est que le chatbot "ne fait pas ce qu'on lui demande".

---

## Objectif

Remplacer les deux endpoints par un seul flux direct : l'utilisateur envoie un message, le LLM modifie les fichiers immédiatement, une nouvelle version est créée. L'itération se fait naturellement via le chat.

---

## Architecture

### Endpoint unique

```
POST /scripts/{script_id}/ai-chat
Body : { "prompt": str, "history": [...], "google_access_token": str | null }
Response : SSE stream
```

Remplace `/ai-clarify` et `/ai-modify-stream`. L'ancien endpoint `/ai-clarify` est supprimé.

### Flux d'un appel

```
1. Frontend envoie prompt + historique de conversation
2. Backend construit : system_prompt + historique + contenu de tous les fichiers
3. Appel Vertex AI Gemini 2.5 Pro (streaming)
4. LLM retourne JSON : {"files": [{"filename": "...", "content": "..."}]}
5. Backend parse le JSON, sauvegarde une nouvelle ScriptVersion
6. SSE envoie : { "type": "result", "data": { "files": [...], "version_id": ... } }
7. Si le LLM ne retourne aucun fichier (demande hors-scope ou question) :
   SSE envoie : { "type": "message", "data": { "text": "..." } }
   Aucune version créée.
```

### Prompt système

```
Tu es un expert Google Apps Script intégré à ExScript, un outil de versioning de projets GAS.
Tu reçois le contenu complet de tous les fichiers du projet et une demande utilisateur.

Si la demande est une modification de code :
- Applique la modification et retourne UNIQUEMENT un JSON de cette forme :
  {"files": [{"filename": "Code.js", "content": "...contenu complet du fichier..."}]}
- N'inclus que les fichiers modifiés. Le contenu doit être le fichier entier réécrit.

Si la demande est une question ou une demande d'explication :
- Retourne UNIQUEMENT un JSON de cette forme :
  {"message": "ta réponse en français"}

Ne génère jamais de texte autour du JSON.
```

### Contexte envoyé au LLM

1. **System prompt** (ci-dessus)
2. **Historique de conversation** — tous les tours précédents :
   - Messages utilisateur : contenu brut
   - Messages assistant : résumé court (`"J'ai modifié Code.js : ajout de la fonction sendEmail"`) ou texte de la réponse précédente
3. **Contenu des fichiers** — injecté dans le message utilisateur courant :
   ```
   Fichiers du projet "{nom}" :

   ### Code.js
   ```javascript
   ...
   ```

   ### Utils.js
   ```javascript
   ...
   ```

   Demande : {prompt utilisateur}
   ```

---

## Versioning

Comportement conservé :
- Chaque appel qui retourne des fichiers modifiés crée une nouvelle `ScriptVersion`
- Les versions sont consultables dans l'onglet Versions existant
- Si le LLM retourne `{"message": "..."}`, aucune version n'est créée

---

## Gestion d'erreurs

- **JSON invalide** : utilise `_parse_llm_json` existant (correction itérative des escapes)
- **Aucun fichier retourné** mais pas de `message` non plus : log serveur, SSE `{ "type": "error", "data": "..." }`
- **Fichier inconnu retourné par le LLM** : ignoré silencieusement (on ne crée que les fichiers qui existent déjà dans la version courante)

---

## Ce qui disparaît

| Élément supprimé | Remplacé par |
|---|---|
| `POST /ai-clarify` | Supprimé |
| `POST /ai-modify-stream` | `POST /ai-chat` |
| Étape de confirmation (bouton Confirmer/Annuler) | Modification directe |
| Boucle agentique (3 tentatives + validation GAS) | Appel unique |
| Classification modification/explanation | LLM décide via le JSON retourné |
| Bulle "clarification" dans le chat | Bulle "résultat" avec fichiers modifiés |

---

## Changements frontend

- Suppression de la logique de confirmation (`confirmed: null | true | false`)
- Suppression de l'affichage de la bulle clarification (reformulation + plan + boutons)
- Ajout d'un rendu pour `{ type: "message" }` (réponse textuelle du LLM)
- Le rendu `{ type: "result" }` avec fichiers modifiés est conservé

---

## Tests

- **Backend** : tests unitaires sur `ai_chat` (mock LLM) — cas modification, cas message, cas JSON invalide, cas fichier inconnu
- **Intégration** : vérifier qu'un prompt de modification crée bien une nouvelle version en base
- **Couverture** : maintenir ≥ 80 %
