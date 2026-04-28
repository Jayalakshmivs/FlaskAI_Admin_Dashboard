# FlaskAI Admin Dashboard

Full-stack admin dashboard for monitoring AI file processing pipelines.

## Tech Stack

| Layer     | Technology                    |
|-----------|-------------------------------|
| Frontend  | React + TypeScript + Vite     |
| Backend   | FastAPI + SQLModel            |
| Database  | PostgreSQL 16                 |
| Deploy    | Docker Compose / Coolify      |

## Quick Start

```bash
# Clone and start all services
docker compose up --build -d

# Open dashboard
http://localhost:5173

# API docs
http://localhost:8000/docs

# Health check
http://localhost:8000/health
http://localhost:8000/health/ready
```

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + routes
│   │   ├── models.py            # SQLModel DB models
│   │   ├── crud.py              # Database queries
│   │   ├── health.py            # Health check endpoints
│   │   └── seed_on_startup.py   # Auto-seeds DB from SQL datasets
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Main app with routing
│   │   ├── pages/               # Dashboard pages
│   │   ├── components/          # Reusable UI components
│   │   └── lib/                 # API client + utilities
│   ├── Dockerfile
│   └── nginx.conf
├── datasets/                    # SQL seed data
├── docker-compose.yml
├── .env.example                 # Environment variable template
└── README.md
```

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

See `.env.example` for all required variables.

## Health Checks

| Endpoint        | Purpose                                      |
|-----------------|----------------------------------------------|
| `GET /health`       | Liveness — is the process running?       |
| `GET /health/ready` | Readiness — is DB connected with data?   |

## Deployment (Coolify)

1. Push to GitHub
2. Connect repo in Coolify
3. Set environment variables from `.env.example`
4. Deploy — backend auto-seeds database on first boot
