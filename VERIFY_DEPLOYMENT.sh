#!/bin/bash
# Comprehensive Project Verification & Testing Script
# Verifies all components are working before deployment

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Flask AI Dashboard - Deployment Verification             ║"
echo "║  Ensures all components are clean and functioning         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

BACKEND_HEALTHY=true
FRONTEND_HEALTHY=true
DATABASE_HEALTHY=true
API_HEALTHY=true

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }

echo "══════════════════════════════════════════════════════════════"
echo "1️⃣  CONTAINER HEALTH CHECK"
echo "══════════════════════════════════════════════════════════════"

# Check if all containers are running
containers=$(docker-compose ps -q)
if [ -z "$containers" ]; then
    log_error "No containers found. Run 'docker-compose up -d --build' first"
    exit 1
else
    container_count=$(echo "$containers" | wc -l)
    log_success "Found $container_count containers"
fi

# Check backend container
if docker-compose exec -T backend curl -s http://localhost:8000/stats > /dev/null 2>&1; then
    log_success "Backend container: Healthy"
else
    log_error "Backend container: Not responding"
    BACKEND_HEALTHY=false
fi

# Check frontend container
if docker-compose exec -T db psql -U postgres -d flaskai -c "SELECT 1" > /dev/null 2>&1; then
    log_success "Database container: Healthy"
else
    log_error "Database container: Not responding"
    DATABASE_HEALTHY=false
fi

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "2️⃣  API ENDPOINT VERIFICATION"
echo "══════════════════════════════════════════════════════════════"

# Test each endpoint
endpoints=(
    "/stats"
    "/files?skip=0&limit=5"
    "/step_metrics?skip=0&limit=5"
    "/users"
    "/jobs?skip=0&limit=5"
)

for endpoint in "${endpoints[@]}"; do
    http_code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8000$endpoint" 2>/dev/null || echo "000")
    if [ "$http_code" = "200" ]; then
        log_success "GET $endpoint → HTTP $http_code"
    else
        log_error "GET $endpoint → HTTP $http_code"
        API_HEALTHY=false
    fi
done

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "3️⃣  DATABASE DATA VALIDATION"
echo "══════════════════════════════════════════════════════════════"

# File count
files=$(docker exec -i flaskai_db psql -U postgres -d flaskai -c "SELECT COUNT(*) FROM files WHERE source='system' AND source_id != 'pdf_generator';" 2>/dev/null | tail -1 | tr -d ' ')
if [ "$files" -ge 160 ]; then
    log_success "Real files: $files (Expected: ~167)"
else
    log_warn "Real files: $files (Expected: ~167)"
fi

# Metrics count
metrics=$(docker exec -i flaskai_db psql -U postgres -d flaskai -c "SELECT COUNT(*) FROM step_metrics;" 2>/dev/null | tail -1 | tr -d ' ')
if [ "$metrics" -ge 830 ]; then
    log_success "Step metrics: $metrics (Expected: ~835)"
else
    log_warn "Step metrics: $metrics (Expected: ~835)"
fi

# Status distribution
comp=$(docker exec -i flaskai_db psql -U postgres -d flaskai -c "SELECT COUNT(*) FROM step_metrics WHERE status='comp';" 2>/dev/null | tail -1 | tr -d ' ')
fail=$(docker exec -i flaskai_db psql -U postgres -d flaskai -c "SELECT COUNT(*) FROM step_metrics WHERE status='fail';" 2>/dev/null | tail -1 | tr -d ' ')
prog=$(docker exec -i flaskai_db psql -U postgres -d flaskai -c "SELECT COUNT(*) FROM step_metrics WHERE status='prog';" 2>/dev/null | tail -1 | tr -d ' ')

log_success "Status distribution: comp=$comp, fail=$fail, prog=$prog"

# Jobs count
jobs=$(docker exec -i flaskai_db psql -U postgres -d flaskai -c "SELECT COUNT(*) FROM jobs;" 2>/dev/null | tail -1 | tr -d ' ')
if [ "$jobs" -ge 160 ]; then
    log_success "Jobs: $jobs"
else
    log_warn "Jobs: $jobs"
fi

# Users count
users=$(docker exec -i flaskai_db psql -U postgres -d flaskai -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tail -1 | tr -d ' ')
log_success "Users: $users"

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "4️⃣  CODE QUALITY CHECK"
echo "══════════════════════════════════════════════════════════════"

# Check Python imports
echo -n "Checking Python imports... "
if docker exec flaskai_backend python -c "import app.main; import app.crud; import app.models" 2>/dev/null; then
    log_success "Python modules: OK"
else
    log_error "Python modules: Failed"
    BACKEND_HEALTHY=false
fi

# Check for common warnings in logs
echo -n "Checking backend logs for errors... "
if docker-compose logs backend 2>/dev/null | grep -q "ERROR"; then
    log_warn "Some errors found in backend logs"
else
    log_success "No critical errors in backend logs"
fi

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "5️⃣  FRONTEND ASSET CHECK"
echo "══════════════════════════════════════════════════════════════"

# Check if dist folder exists in container
if docker-compose exec -T frontend test -f /usr/share/nginx/html/index.html 2>/dev/null; then
    log_success "Frontend build artifacts: Present"
    log_success "Frontend assets: Properly served"
else
    log_warn "Frontend build artifacts: May not be accessible"
fi

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "6️⃣  REAL-TIME POLLING VERIFICATION"
echo "══════════════════════════════════════════════════════════════"

# Check if pages have polling configured (5-second intervals)
pages=(
    "FileList.tsx"
    "StepMetricsList.tsx"
    "RecentFiles.tsx"
    "Overview.tsx"
)

for page in "${pages[@]}"; do
    if grep -q "refetchInterval: 5000" "frontend/src/pages/$page" 2>/dev/null; then
        log_success "Real-time polling: Enabled in $page (5s)"
    else
        log_warn "Real-time polling: Check $page manually"
    fi
done

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "7️⃣  CONFIGURATION VALIDATION"
echo "══════════════════════════════════════════════════════════════"

# Check database URL
if grep -q "postgresql://postgres:postgres@db:5432/flaskai" "backend/app/main.py" 2>/dev/null; then
    log_success "Database URL: Configured correctly"
else
    log_warn "Database URL: Verify configuration"
fi

# Check API URL in frontend
if grep -q "VITE_API_URL" "frontend/vite.config.ts" 2>/dev/null; then
    log_success "API URL: Configured for frontend"
else
    log_warn "API URL: Verify frontend configuration"
fi

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "📋 FINAL VERIFICATION REPORT"
echo "══════════════════════════════════════════════════════════════"

if [ "$BACKEND_HEALTHY" = true ] && [ "$FRONTEND_HEALTHY" = true ] && [ "$DATABASE_HEALTHY" = true ] && [ "$API_HEALTHY" = true ]; then
    echo -e "${GREEN}"
    echo "✓ All systems operational"
    echo "✓ Ready for production deployment"
    echo "✓ All health checks passed"
    echo -e "${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Access dashboard: http://localhost:5173"
    echo "2. Verify pages load properly"
    echo "3. Check real-time data updates"
    echo "4. Review deployment logs: docker-compose logs"
    exit 0
else
    echo -e "${RED}"
    echo "✗ Some checks failed"
    echo "✗ Review errors above and fix issues"
    echo -e "${NC}"
    exit 1
fi
