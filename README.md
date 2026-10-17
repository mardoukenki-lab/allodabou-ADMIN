# Allô Dabou Admin 🚖 (Dabou, Côte d'Ivoire)

Application PWA d'administration mobile-first, 100 % en français, servant à recevoir, contrôler et valider en temps réel les candidatures des chauffeurs partenaires de l'application **Allô Dabou Chauffeur**.

- **Projet Firebase** : `project-89032b5a-6178-4b41-90b`
- **Base Firestore** : `ai-studio-alldabouchauffeu-4067e958-2691-4e2f-a95e-8d4eb5c7aa3b`
- **Fuseau horaire** : `Africa/Abidjan` (jj/mm/aaaa hh:mm)
- **Devise** : Francs CFA (`FCFA`)
- **Contact central Dabou** : `+225 01 01 68 25 35`

---

## 1. Comment créer son compte Super Admin (`mardoukeni@gmail.com`)

Deux méthodes simples et sécurisées sont disponibles :

### Méthode A : Directement depuis l'écran d'accueil de l'application (Recommandée)
1. Ouvrez l'application **Allô Dabou Admin**.
2. Sur l'écran de connexion, cliquez sur le bouton vert : **« Premier démarrage ? Activer mon compte Super Admin »**.
3. Choisissez votre mot de passe (minimum 6 caractères) et confirmez-le.
4. Cliquez sur **« Activer et me connecter »** :
   - Votre compte Firebase Auth est créé.
   - Votre document Super Administrateur `admins/{uid}` est automatiquement amorcé dans Firestore.
   - Les règles de sécurité déployées reconnaissent instantanément votre adresse comme Super Admin.
5. Vous accédez immédiatement au tableau de bord.

### Méthode B : Depuis la console Firebase (Option manuelle)
1. Ouvrez la **Console Firebase** > Projet `project-89032b5a-6178-4b41-90b`.
2. Allez dans **Authentication** > **Users** > Cliquez sur **Ajouter un utilisateur** avec `mardoukeni@gmail.com` et votre mot de passe.
3. Copiez l'**UID** généré.
4. Allez dans **Firestore Database** (base `ai-studio-alldabouchauffeu-...`) > collection `admins` > Ajoutez un document avec comme ID l'**UID** copié :
   ```json
   {
     "email": "mardoukeni@gmail.com",
     "name": "Super Administrateur Allô Dabou",
     "role": "super_admin",
     "fcmTokens": [],
     "createdAt": "2026-10-15T00:00:00Z"
   }
   ```
5. Connectez-vous sur l'application avec cet e-mail et votre mot de passe.

---

## 2. Comment le Super Admin ajoute les 5 Administrateurs

Le Super Administrateur dispose d'un module dédié dans **Paramètres > Équipe Admins (5 max)** :

1. Connectez-vous avec `mardoukeni@gmail.com`.
2. Rendez-vous dans **Paramètres** puis sélectionnez l'onglet **« Équipe Admins (5 max) »**.
3. Cliquez sur le bouton vert **« Ajouter un admin »** (le compteur affiche `X / 5 places`).
4. Renseignez :
   - Le **Nom complet** de l'agent (ex: *Kouamé Jean - Dispatch Dabou*)
   - L'**Adresse e-mail** (ex: *kouame.dabou@gmail.com*)
   - Le **Rôle** : `Administrateur` (validation, refus, suspension) ou `Dispatch` (consultation, contact terrain)
   - Le **Mot de passe initial** (un bouton magique *« Générer un mot de passe »* est à disposition).
5. Validez en cliquant sur **« Créer le compte »** :
   - L'identifiant est créé de manière transparente dans Firebase Auth sans déconnecter le Super Admin.
   - Le profil administrateur est enregistré dans la collection `admins/{uid}` avec rôle et permissions.
   - L'action est inscrite dans le journal d'audit `adminLogs`.
6. Une modale affiche les accès avec un bouton **« Copier pour WhatsApp / SMS »** pour transmettre la fiche directement à l'agent.
7. Pour retirer un administrateur et libérer une place, cliquez sur l'icône corbeille à côté de son nom.

---

## 3. Configuration des Notifications Push (Firebase Cloud Messaging)

L'application intègre un système d'alerte en deux niveaux pour ne manquer aucune candidature :

### Niveau 1 : Alerte instantanée au premier plan (App ouverte sur PC ou mobile)
- Dès qu'un chauffeur termine son inscription sur l'app Allô Dabou Chauffeur, le document `users/{uid}` est créé en temps réel avec `role: 'driver_pending'`.
- L'app Admin joue immédiatement le **carillon audio Dabou** (synthétisé via la Web Audio API, fréquence 587 Hz et 880 Hz).
- Un bandeau flottant (Toast) vert apparaît avec le nom du chauffeur et un bouton d'accès direct au dossier.
- L'icône de l'onglet et le titre du navigateur s'actualisent en `(1) Nouvelle candidature ! • Allô Dabou Admin`.
- Le badge rouge de notification s'incrémente sur l'onglet **Candidatures**.

### Niveau 2 : Notifications Push FCM en arrière-plan (App fermée ou écran éteint)
1. Rendez-vous dans **Paramètres > Notifications Push (FCM)**.
2. Cliquez sur **« Activer les notifications push sur cet appareil »**.
3. Autorisez les notifications lorsque le navigateur le demande.
4. L'application génère un jeton Web Push FCM sécurisé via la clé VAPID officielle :
   ```env
   VITE_FIREBASE_VAPID_KEY="BCzlvzh8YQJcHoXbxlDWTWD_fbqf4ACfVZSpxizv87vkAZ8PQma_injX3sD3lgjN4YgxdWi5q3uprrO_q6jzZJU"
   ```
5. Ce jeton est enregistré automatiquement dans `admins/{uid}.fcmTokens`.
6. Le service worker `/firebase-messaging-sw.js` intercepte les messages FCM en arrière-plan et affiche une notification système avec icône Dabou, vibreur et sonnerie.
7. Un bouton **« Tester l'alerte sonore et visuelle »** permet de vérifier le fonctionnement à tout moment.
8. Un modèle complet de Cloud Function Firebase (`functions/src/index.ts`) est disponible dans l'onglet FCM pour les notifications serveur automatiques.

---

## 4. Dispositif GNANGO & Règles Métier

- **Immatriculation unique** : chaque chauffeur reçoit à l'inscription son code `GNG-XXXXXX` (alphabet Crockford Base32 `ABCDEFGHJKMNPQRSTUVWXYZ23456789`). Ce code est unique et réservé dans `driverCodes/{code}`.
- **Cartes d'identification** :
  - **Sans permis (`hasLicense: false`)** : délivrance d'une carte provisoire avec QR code (`provisional_qr`) valable par défaut 3 mois (configurable dans `settings/gnango`). Le QR code encode l'URL publique `/verifier/<driverCode>` sans aucune donnée personnelle.
  - **Avec permis (`hasLicense: true`)** : délivrance d'une carte officielle standard permanente (`standard`) sans QR code.
- **Renouvellement des cartes** :
  - Dès 15 jours avant expiration (valeur `renewalAlertDays` dans `settings/gnango`), une alerte apparaît dans l'onglet **Cartes à renouveler**.
  - Si le chauffeur présente son permis en agence, l'admin clique sur **« Permis présenté → Carte standard »**, ce qui supprime la date d'expiration et passe le compte en statut permanent.
- **Protection en cas de suspension** :
  - Si un chauffeur a une course active en cours (`rides` avec statut `accepted`, `arrived` ou `in_progress`), la modale de suspension affiche un avertissement explicite.

---

## 5. Règles de Sécurité Firestore Déployées (`firestore.rules`)

Les règles de sécurité Firestore sont déployées sur le projet `project-89032b5a-6178-4b41-90b` et garantissent :
- Autorisation du Super Admin (`isSuperAdminEmail()` pour `mardoukeni@gmail.com`).
- Gestion de la collection `admins/{uid}` : création et suppression réservées au Super Admin, mise à jour des jetons `fcmTokens` par chaque admin.
- Protection stricte de `users` : lecture des candidatures et validation réservées aux admins ; le chauffeur ne peut pas modifier son statut.
- Journal d'audit inaltérable `adminLogs` (append-only atomique).
