# Development Guide

Step-by-step instructions for teammates to pull, run, and develop this app using npm.

## 1) Prerequisites
- Node.js 18.x
- npm 10+
- Docker Desktop (optional, for local MySQL)

Verify versions:
```bash
node -v
npm -v
```

## 2) Clone or pull the repo
```bash
# First time
git clone <your-repo-url> filipino-pos-system
cd filipino-pos-system

# Subsequent updates
git pull origin main
```

## 3) Environment variables
- Copy `.env.example` to `.env` and fill values.
- This app reads `MYSQL_URL` (preferred) and will also fallback to `DATABASE_URL` if present.

Examples:
```bash
# Using local Docker MySQL
MYSQL_URL=mysql://pos_user:pos_password@localhost:3306/filipino_pos

# Using the compose network inside containers (service name: mysql)
# MYSQL_URL=mysql://pos_user:pos_password@mysql:3306/filipino_pos
```

## 4) Install dependencies (npm)
```bash
npm install
```

Note: If you use Docker Compose (`app` or `app-dev`), you do not need to run
`npm install` on your machine. Dependencies are installed inside the image during
the build. Run `npm install` locally only when running `npm run dev` directly on
your host machine (outside Docker).

## 5) Start MySQL (choose one)
- Option A: Use Docker Compose for MySQL locally
```bash
# Starts only the MySQL service
docker compose up -d mysql
```
- Option B: Use your own MySQL instance
  - Ensure `MYSQL_URL` in `.env` points to your DB (host, port, db, user, password).

## 6) Run the app (development)
```bash
npm run dev
# App: http://localhost:3000
```

## 7) Alternative: Run via Docker Compose (dev hot reload)
```bash
# Start DB
docker compose up -d mysql
# Start dev app (hot reload)
docker compose up app-dev
# App: http://localhost:3001
```

## 8) Add or update dependencies
- Add a runtime dependency:
```bash
npm install <package>
```
- Add a dev dependency:
```bash
npm install -D <package>
```
- Remove a dependency:
```bash
npm uninstall <package>
```
- After changes, commit the updated `package.json` and `package-lock.json`.

## 9) Lint, build, and test
```bash
# Lint (if configured)
npm run lint

# Build (production)
npm run build
```

## 10) Common issues
- Database URL errors (e.g., `getaddrinfo`):
  - Confirm `MYSQL_URL` is correct and has no extra quotes/spaces.
  - If using Docker MySQL locally, ensure the container is running:
    ```bash
    docker compose ps
    ```
  - Test connectivity to the host/port.

## 11) Commit and push changes
```bash
git status
git add .
git commit -m "feat: <short description>"
git push origin main
```

> Tip: Create feature branches for larger changes:
```bash
git checkout -b feat/my-change
# ... work ...
git push -u origin feat/my-change
```
