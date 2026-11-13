# Atelier pratique : OAuth 2.0 / OpenID Connect

**Module : Sécurité des systèmes distribués — ENSET Mohammedia**  
Application React + API Spring Boot sécurisées avec Keycloak, Authorization Code + PKCE (S256), JWT et rôles USER / ADMIN.

## Prérequis
Docker Desktop actif, JDK 17+, Maven 3.9+, Node.js 20+ (ou 22+) avec npm, navigateur et Postman (optionnel).

## 1. Démarrer Keycloak
Dans le dossier racine :

```powershell
docker compose up -d
docker compose logs -f keycloak
```

Après démarrage, ouvrir **http://localhost:8080**. Administration : `admin` / `admin` (uniquement pour ce TP local).

## 2. Configurer Keycloak (manuellement, indispensable)

1. Créer un realm nommé **enset-realm**.
2. Dans ce realm, créer un client **OpenID Connect** avec **Client ID = react-client**.
3. Configurer **Client authentication: Off**, **Standard flow: On**, **Implicit flow: Off**, **Direct access grants: Off**.
4. Root URL et Home URL : `http://localhost:5173/` ; Valid redirect URIs : `http://localhost:5173/*` ; **Valid post logout redirect URIs : `http://localhost:5173/*`** (sinon la déconnexion peut afficher « Invalid redirect uri ») ; Web origins : `http://localhost:5173`.
5. PKCE Code Challenge Method : **S256**, si l'option est présente (le client React active aussi PKCE S256).
6. Dans **Realm roles**, créer **USER** et **ADMIN**.
7. Dans **Users**, créer `alice` (mot de passe `alice123`, rôle USER) et `bob` (`bob123`, rôles USER et ADMIN). **Renseigner aussi email, prénom et nom, et activer *Email verified*** : avec le User Profile de Keycloak 24+, un utilisateur sans ces champs se voit imposer l'écran « Update Account Information » à la première connexion, ce qui bloque la redirection vers React. Définir les mots de passe non temporaires dans **Credentials**. Attribuer les rôles via **Role mapping**.
8. Vérifier les **client scopes** / mappers par défaut : le jeton d'accès doit inclure `realm_access.roles` avec les rôles attribués. Si le claim est absent, vérifier le scope `roles` et ses mappers, puis se reconnecter.

Ces identifiants faibles ne servent qu'à la démonstration en local. **Ne jamais les réutiliser en production.**

## 3. Démarrer le backend Spring Boot
Dans un **deuxième terminal** :

```powershell
cd demandes-api
mvn spring-boot:run
# (le projet ne contient pas de Maven Wrapper : Maven 3.9+ doit être installé)
```

Test public : **http://localhost:8081/api/public** → `{"message":"API publique accessible"}`.  
Test sans token : **http://localhost:8081/api/demandes** → `401 Unauthorized`.

**Attention :** L'API contacte Keycloak sur le port 8080 pour découvrir les clés publiques JWT (au premier jeton reçu). Keycloak doit être démarré et le realm `enset-realm` créé avant de tester les endpoints protégés.

## 4. Démarrer le frontend React
Dans un **troisième terminal**, depuis le dossier racine :

```powershell
cd demandes-front
npm install
npm run dev
```

Ouvrir **http://localhost:5173**. Une redirection automatique vers la connexion Keycloak doit apparaître.

## 5. Scénarios de test

| ID | Action | Résultat attendu |
|---|---|---|
| 1 | Connexion Alice (`alice123`) | Ses demandes uniquement, sans espace ADMIN |
| 2 | Alice crée une demande | Nouvelle demande `EN_ATTENTE` |
| 3 | Connexion Bob (`bob123`) | Espace ADMIN visible, toutes les demandes listées |
| 4 | Bob valide une demande | Statut `VALIDEE` |
| 5 | Bob refuse une demande | Statut `REFUSEE` |
| 6 | `GET /api/profil` avec un token valide | `id` (`sub`) et `username` (`preferred_username`) |
| 7 | `GET /api/demandes` sans jeton | **401** |
| 8 | `GET /api/demandes` avec jeton modifié | **401** |
| 9 | `GET /api/admin/demandes` avec token Alice | **403** |
| 10 | `GET /api/admin/demandes` avec token Bob | **200** |
| 11 | `PATCH /api/admin/demandes/1` avec token Alice | **403** |
| 12 | `PATCH /api/admin/demandes/1` avec token Bob | **200** |

Dans Postman, ouvrir **Authorization → Bearer Token** pour fournir un jeton de test.

**Comment obtenir un jeton pour Postman ?** Le client `react-client` est public avec *Direct access grants* désactivé : le flux « password » ne fonctionne donc pas. Deux options :
1. Se connecter dans React, ouvrir DevTools → Network, copier la valeur après `Bearer ` d'une requête vers `localhost:8081` (jeton de test uniquement).
2. Dans Postman : Authorization → OAuth 2.0 → *Authorization Code (With PKCE)*, Auth URL `http://localhost:8080/realms/enset-realm/protocol/openid-connect/auth`, Access Token URL `http://localhost:8080/realms/enset-realm/protocol/openid-connect/token`, Client ID `react-client`, Code Challenge Method `SHA-256`, Callback URL `https://oauth.pstmn.io/v1/callback`. **Ajouter cette URL dans *Valid redirect URIs* du client** (et son origine `https://oauth.pstmn.io` dans *Web origins* si nécessaire).

La durée de vie par défaut d'un Access Token est de **5 minutes** : en cas de 401 inattendu dans Postman, récupérer un nouveau jeton. Vous pouvez observer l'en-tête `Authorization: Bearer ...` dans les DevTools navigateur, mais **ne partagez pas de véritables jetons dans un rapport ou sur GitHub**. Masquez entièrement l'en-tête/token dans les captures.

Exemple de corps pour la création de demande (POST `/api/demandes`) :
```json
{"objet":"Demande de certificat"}
```
Exemple de corps pour la modification (PATCH `/api/admin/demandes/1`) :
```json
{"statut":"REFUSEE"}
```

## 6. Captures d'écran à faire pour le compte rendu

- **C1** : `docker compose ps` + console Keycloak accessible.
- **C2** : realm `enset-realm` et client `react-client` (URI de redirection / PKCE).
- **C3** : rôles USER/ADMIN et mappings d'Alice/Bob (sans mots de passe).
- **C4** : démarrage de Spring Boot + réponse de `/api/public`.
- **C5** : réponse 401 de `/api/demandes` sans token.
- **C6** : page de connexion Keycloak puis vue React d'Alice.
- **C7** : demande créée par Alice, sans panneau ADMIN.
- **C8** : vue de Bob avec le panneau d'administration.
- **C9** : validation puis refus de demandes (statuts affichés).
- **C10** : `GET /api/profil` (masquer toute information sensible si nécessaire).
- **C11** : Postman 401 (token absent/invalide), 403 (Alice/ADMIN), 200 (Bob/ADMIN).
- **C12** : DevTools → Network → requête API, **avec jeton masqué**.

## Remarques de sécurité
Le backend vérifie les JWT et les rôles de realm via Spring Security. Le frontend n'est qu'un affichage conditionnel : masquer le panneau ADMIN ne remplace pas la vérification serveur. L'API ne stocke aucune demande de façon permanente (données en mémoire). Les jetons Keycloak JS restent en mémoire, pas dans `localStorage`. La configuration `start-dev`, les credentials de démonstration, le HTTP local et le CORS limité à localhost ne sont **pas** adaptés à la production.

## Arrêt
```powershell
docker compose down
```
Utiliser `docker compose down -v` **seulement si vous voulez effacer définitivement la configuration locale Keycloak** (realm, comptes, etc.).

## Contenu
- `docker-compose.yml` : Keycloak
- `demandes-api/` : API Spring Boot sécurisée + `/api/profil`
- `demandes-front/` : React/Vite + PKCE + création, validation et refus
- `README.md` : installation, tests, captures

Projet préparé d'après le support « Activité pratique OAuth 2.0 et OpenID Connect » (20 pages). Aucune exécution end-to-end n'est revendiquée avant configuration et lancement sur la machine de l'étudiant.
