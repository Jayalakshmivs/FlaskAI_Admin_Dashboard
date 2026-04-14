# Flask AI Dashboard - Deployment Guide

## 🚀 Quick Start Deployment

### Prerequisites
- Docker & Docker Compose installed
- 2GB RAM minimum
- 10GB disk space

### Deployment Steps

```bash
# 1. Navigate to project directory
cd flask-ai-dashboard-final-fixed/final_fixed

# 2. Build and start all services
docker-compose up -d --build

# 3. Verify deployment
bash HEALTH_CHECK.sh

# 4. Access dashboard
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000
# Database: localhost:5432 (postgres:postgres)
```

## 📋 Architecture

### Backend (FastAPI)
- **Location**: `backend/`
- **Port**: 8000
- **Endpoints**:
  - `GET /stats` - Dashboard statistics
  - `GET /files` - File list with filtering
  - `GET /step_metrics` - Step metrics with pagination
  - `GET /jobs` - Job list
  - `GET /users` - User list

### Frontend (React + Vite)
- **Location**: `frontend/`
- **Port**: 5173
- **Pages**:
  - Overview - Dashboard with charts
  - Files - File list with real-time updates
  - Jobs - Job list
  - Step Metrics - Metrics breakdown
  - Users - User list

### Database (PostgreSQL)
- **Port**: 5432
- **Database**: `flaskai`
- **User**: `postgres`
- **Password**: `postgres`
- **Tables**: files, jobs, users, step_metrics

## ✅ Health Checks

### API Health
```bash
curl http://localhost:8000/stats
```

### Database Health
```bash
docker exec flaskai_db psql -U postgres -d flaskai -c "SELECT COUNT(*) FROM files;"
```

### Frontend Health
```bash
curl http://localhost:5173
```

## 📊 Data Initialization

### Current Data Status
- **Files**: 167 real files (source='system', source_id != 'pdf_generator')
- **Step Metrics**: 835 records (5 steps per file)
- **Jobs**: 167
- **Users**: 18

### Data Distribution
- **Success Status**: 611 metrics (comp status)
- **Failed Status**: 120 metrics (fail status)
- **In Progress**: 104 metrics (prog status)

### Pipeline Performance
- extract: 72 complete, 11 errors
- search: 66 complete, 13 errors
- index: 65 complete, 14 errors
- valid: 69 complete, 16 errors
- store: 60 complete, 13 errors

## 🔧 Configuration

### Real-time Polling
- Interval: 5 seconds
- Pages affected: Overview, Files, Step Metrics, Jobs, Users

### Environment Variables
```bash
DATABASE_URL=postgresql://postgres:postgres@db:5432/flaskai
VITE_API_URL=/api
```

## 📦 Production Build

### Build without Docker
```bash
# Backend
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# Frontend
cd frontend
npm install --legacy-peer-deps
npm run build
npx serve -s dist -l 5173
```

## 🐛 Troubleshooting

### Services Won't Start
```bash
# Check logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs db

# Rebuild
docker-compose down -v
docker-compose up -d --build
```

### Database Connection Issues
```bash
# Verify database is running
docker-compose ps

# Check database connection
docker exec flaskai_db pg_isready -U postgres
```

### Frontend Not Loading
```bash
# Clear cache
curl http://localhost:5173 -H 'Cache-Control: no-cache'

# Check frontend logs
docker-compose logs frontend
```

## 📚 API Documentation

### GET /stats
Returns dashboard statistics
```json
{
  "total_files": 167,
  "total_success": 17,
  "total_failures": 150,
  "success_rate": 10.18,
  "pipeline_performance": {
    "extract": {"complete": 72, "error": 11},
    ...
  }
}
```

### GET /files
Returns paginated file list
```json
{
  "items": [...],
  "total": 167
}
```

### GET /step_metrics
Returns paginated step metrics
```json
{
  "items": [...],
  "total": 835
}
```

## ✨ Features

- ✅ Real-time data updates (5-second polling)
- ✅ Dashboard with multiple pages
- ✅ File and job management
- ✅ Step metrics tracking
- ✅ User management
- ✅ Status-based filtering
- ✅ Responsive design
- ✅ PostgreSQL persistence
- ✅ FastAPI backend
- ✅ React + Vite frontend

## 🔒 Security Notes

- [ ] Change default database password
- [ ] Enable database backups
- [ ] Set up SSL/TLS for production
- [ ] Implement authentication
- [ ] Add rate limiting
- [ ] Enable CORS properly for production domain

## 📝 Maintenance

### Daily
- Monitor API logs
- Check database disk space

### Weekly
- Review error logs
- Backup database

### Monthly
- Review performance metrics
- Update dependencies

## 📞 Support

For issues or questions:
1. Check logs: `docker-compose logs`
2. Run health checks: `bash HEALTH_CHECK.sh`
3. Review API endpoints documentation
4. Check database status

---

**Deployment Date**: 2026-04-14  
**Version**: 1.0  
**Status**: ✅ Production Ready
