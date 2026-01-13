# SaaS Starter Template

A production-ready SaaS application template with authentication, user management, admin panel, tier system, and internationalization. Built with TypeScript, React, and PostgreSQL.

## What Is This?

This is a complete foundation for building SaaS applications. It provides all the essential infrastructure you need to start building your product immediately, without spending weeks on authentication, user management, and basic features.

**Perfect for:**
- Building a new SaaS product
- Learning modern web development practices
- Prototyping ideas quickly
- Understanding full-stack architecture

## Quick Start

```bash
# 1. Copy environment configuration
cp example.env .env

# 2. Start all services (database, backend, frontend)
docker compose up -d --build

# 3. Access the application
# Frontend: http://localhost:8080
# API: http://localhost:3000
```

**Default Admin Account:**
- Email: `admin@example.com`
- Password: `admin`

⚠️ Change this password immediately in production!

## What You Get

### Core Features
- **Authentication System**: Email-based registration with verification, password reset, JWT tokens
- **User Management**: Profile management, email changes, account deletion, data export (GDPR)
- **Admin Panel**: User management, role assignment, system configuration
- **Tier System**: Multi-tier subscription support (starter, pro, business, enterprise) with usage tracking
- **Notification System**: Banners and toast notifications with real-time updates via SSE
- **Task Scheduler**: Cron-based background job framework
- **Internationalization**: Multi-language support (English, German) with easy extensibility
- **Production Ready**: Docker deployment, logging, error handling, rate limiting

### Technology Stack
- **Backend**: Node.js + Express.js + TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Infrastructure**: Docker + Docker Compose
- **Testing**: Jest (backend) + Vitest (frontend)

## Setup

### Prerequisites
- Docker and Docker Compose (that's it!)
- No Node.js, PostgreSQL, or other tools needed locally

### Installation

1. **Clone and configure:**
```bash
git clone <repo-url>
cd saas-starter-template
cp example.env .env
```

2. **Edit `.env` with your settings:**
```env
# JWT Secret (generate with: openssl rand -hex 32)
JWT_SECRET=your-secure-jwt-secret-min-32-chars

# Email (SMTP) - Required for registration/password reset
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-smtp-password
SMTP_FROM=noreply@yourdomain.com

# URLs
BASE_URL=http://localhost:8080
API_BASE_URL=http://localhost:3000
```

3. **Start services:**
```bash
docker compose up -d --build
```

4. **Verify:**
```bash
# Check services
docker compose ps

# Check API health
curl http://localhost:3000/health

# Open frontend
open http://localhost:8080
```

## Usage

### First Steps

1. **Log in as admin** at http://localhost:8080
   - Email: `admin@example.com`
   - Password: `admin`

2. **Explore the interface:**
   - Dashboard (main authenticated page)
   - Profile (manage your account)
   - Admin Panel (user management, banners, tasks)

3. **Create a test user:**
   - Log out from admin
   - Click "Sign Up"
   - Check email for confirmation link (Mailtrap if using dev config)

### Common Commands

```bash
# Start services
docker compose up -d

# Rebuild after code changes
docker compose up -d --build

# View logs
docker compose logs -f app

# Stop services
docker compose down

# Database access
docker compose exec db psql -U clicktracking -d clicktracking

# Run tests
docker compose exec app npm test -- --runInBand
```

## Customization

### 1. Update Branding
- Replace logo/favicon in `frontend/public/`
- Update app name in `package.json`
- Customize colors in `frontend/tailwind.config.js`

### 2. Add Features
- Create database models in `prisma/schema.prisma`
- Add backend services in `src/services/`
- Create API endpoints in `src/controllers/` and `src/routes/`
- Build frontend components in `frontend/src/components/`

### 3. Customize Tiers
- Edit `src/config/account-tiers.json`
- Update pricing page in `frontend/src/pages/Pricing.tsx`

### 4. Add Translations
- Add keys to `src/locales/{language}/` (backend)
- Add keys to `frontend/public/locales/{language}/` (frontend)

## Architecture

```
┌─────────────────────────────────────────┐
│         Docker Compose Stack            │
├─────────────────────────────────────────┤
│  Frontend (Nginx + React)               │
│  Port: 8080                             │
├─────────────────────────────────────────┤
│  Backend API (Node.js + Express)        │
│  Port: 3000                             │
├─────────────────────────────────────────┤
│  Database (PostgreSQL 16)               │
│  Port: 5432                             │
└─────────────────────────────────────────┘
```

**Key Design Principles:**
- Stateless services for easy scaling
- JWT authentication (no session storage)
- Docker-first development
- Type-safe with TypeScript
- Comprehensive testing

## Development with Kiro

This template is designed to work seamlessly with Kiro, an AI-powered development assistant.

### Steering Files

The `.kiro/steering/` directory contains guidelines that help Kiro understand project conventions:

- **test-execution.md**: Test running workflow (always use `--runInBand` for Jest)
- **docker-rebuild-requirement.md**: Rebuild containers after code changes
- **docker-compose-command.md**: Use `docker compose` (V2 syntax)
- **postgres-database-config.md**: Database credentials and commands
- **spec-naming-convention.md**: Naming pattern for spec documents
- **property-tests.md**: Guidelines for property-based testing
- **modal-rendering.md**: React modal rendering best practices

These files automatically guide Kiro when you're developing new features, ensuring consistency with project standards.

### Creating Specs

Use specs to plan and implement complex features:

```bash
# List existing specs
ls .kiro/specs/

# Create a new spec (Kiro will use the next number automatically)
# Example: 001-new-feature/
#   - requirements.md
#   - design.md
#   - tasks.md
```

Specs provide a structured way to:
1. Define requirements
2. Design the solution
3. Break down implementation tasks
4. Track progress

### Working with Kiro

**Example prompts:**
- "Add a new feature for user notifications"
- "Create tests for the authentication service"
- "Fix the bug in the profile update endpoint"
- "Add French language support"

Kiro will:
- Follow the steering file guidelines automatically
- Use proper test execution commands
- Rebuild Docker containers after changes
- Follow naming conventions
- Apply best practices

## Testing

```bash
# Backend tests
docker compose exec app npm test -- --runInBand

# Frontend tests
cd frontend && npm test

# Run specific test
docker compose exec app npm test -- src/__tests__/services/auth.test.ts --runInBand

# With coverage
docker compose exec app npm test -- --coverage --runInBand
```

**Important:** Always use `--runInBand` for backend tests to prevent database conflicts.

## Deployment

### Production Checklist
- [ ] Change default admin password
- [ ] Generate secure JWT secret (min 32 chars)
- [ ] Configure production database (managed service recommended)
- [ ] Set up email service (SendGrid, Mailgun, AWS SES)
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS for production domains
- [ ] Set LOG_LEVEL to 'warn' or 'error'
- [ ] Set up database backups
- [ ] Configure monitoring and alerting

### Quick Deploy

```bash
# 1. Configure production environment
cp example.env .env
nano .env  # Edit with production values

# 2. Deploy
docker compose up -d --build

# 3. Verify
curl https://api.yourdomain.com/health
```

See deployment examples for AWS, GCP, Azure, and DigitalOcean in the repository.

## Troubleshooting

### Services won't start
```bash
docker compose logs
docker compose ps
```

### Can't access frontend
```bash
curl http://localhost:8080
docker compose logs frontend
```

### Can't access API
```bash
curl http://localhost:3000/health
docker compose logs app
```

### Database issues
```bash
docker compose exec db pg_isready -U clicktracking
docker compose logs db
```

### Email not sending
1. Verify SMTP settings in `.env`
2. Check backend logs: `docker compose logs app`
3. Test SMTP connection manually

## API Reference

**Key Endpoints:**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/profile` - Get user profile
- `GET /api/admin/users` - List users (admin only)
- `GET /api/banners` - Get active banners
- `GET /api/config` - Get app configuration
- `GET /health` - Health check

Full API documentation available in the repository.

## Project Structure

```
.
├── src/                    # Backend source code
│   ├── controllers/        # API endpoint handlers
│   ├── services/           # Business logic
│   ├── middleware/         # Express middleware
│   ├── routes/             # API routes
│   ├── tasks/              # Scheduled tasks
│   ├── locales/            # Backend translations
│   └── templates/          # Email templates
├── frontend/               # Frontend React app
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom hooks
│   │   └── i18n/           # Frontend i18n config
│   └── public/
│       └── locales/        # Frontend translations
├── prisma/                 # Database schema and migrations
├── .kiro/                  # Kiro configuration
│   ├── steering/           # Development guidelines
│   └── specs/              # Feature specifications
├── docker-compose.yml      # Docker services configuration
└── Dockerfile              # Backend container definition
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- **Issues**: Open an issue on GitHub
- **Logs**: `docker compose logs -f`
- **Health Check**: `curl http://localhost:3000/health`

## Acknowledgments

Built with modern web technologies and best practices for SaaS application development.
