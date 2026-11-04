# Éco-Voyage

Plateforme d'écotourisme qui met en relation des éco-voyageurs avec des guides, des prestataires et des porteurs de projet. Les voyageurs découvrent et réservent des offres et des circuits. Les professionnels publient leurs offres, gèrent leurs disponibilités et collaborent entre eux.

Projet universitaire réalisé en équipe.

**Application :** http://ecovoyage.duckdns.org:3004 (pas encore d'utilisateurs réels, la base de production est vide)

## Documentation

La conception, les décisions techniques, le workflow de déploiement et les limites connues sont décrits dans [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Stack

| Partie | Technologies |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS, Leaflet |
| API | NestJS, TypeScript, Swagger |
| Données | PostgreSQL 15 (TypeORM), MongoDB 7 (Mongoose) |
| Authentification | JWT, refresh token, connexion Google |
| Services externes | Cloudinary, SMTP, Google Gemini |
| Déploiement | Docker, Docker Compose, VPS |

## Structure du dépôt

```
eco-tourism-platform-backend/   API NestJS (src/<module>)
eco-tourism-platform-front/     Application Next.js (app/, components/, lib/)
docker-compose.local.yml        PostgreSQL et MongoDB pour le développement
docker-compose.yml              Déploiement de production
docs/                           Documentation technique
```

## Lancer le projet en local

Prérequis : Node.js 20, Yarn et Docker.

**1. Démarrer les bases de données**

```bash
docker compose -f docker-compose.local.yml up -d
```

**2. Configurer et lancer l'API**

Créer `eco-tourism-platform-backend/.env.dev` :

```bash
PORT=4000
FRONTEND_URL=http://localhost:3003
BACKEND_URL=http://localhost:4000

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=eco
DB_PASSWORD=eco_local
DB_NAME=eco_tourism
MONGODB_URI=mongodb://localhost:27017/ecovoyage

JWT_SECRET=
JWT_EXPIRES_IN=2d

# Facultatif selon les fonctionnalités testées
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
MAIL_FROM=
```

```bash
cd eco-tourism-platform-backend
yarn install
yarn start:dev
```

L'API répond sur http://localhost:4000/api et Swagger sur http://localhost:4000/swagger.

Des données de démonstration peuvent être créées avec `yarn seed:demo`, `yarn seed:offers` et `yarn seed:circuits`.

**3. Configurer et lancer le frontend**

Créer `eco-tourism-platform-front/.env.local` :

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api
GEMINI_API_KEY=
```

```bash
cd eco-tourism-platform-front
yarn install
yarn dev
```

Le site est disponible sur http://localhost:3003.

## Commandes utiles

| Dossier | Commande | Rôle |
|---|---|---|
| Backend | `yarn test` | Tests unitaires (Jest) |
| Backend | `yarn lint` | Lint avec correction automatique |
| Backend | `yarn build` | Build de production |
| Frontend | `yarn lint` | Lint |
| Frontend | `yarn build` | Build de production, avec vérification des types |
