# Design Document: SaaS Starter Template

## Overview

The SaaS Starter Template is a production-ready application built with a modern technology stack: TypeScript, React, Express.js, PostgreSQL, and Docker. The architecture follows a clean separation between frontend, backend, and database layers, with comprehensive features for authentication, user management, admin operations, tier management, notifications, and internationalization.

The design emphasizes security, scalability, maintainability, and developer experience. All components are containerized for consistent deployment across environments.

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Internet                            │
└────────────────┬────────────────────────┬───────────────────┘
                 │                        │
        ┌────────▼────────┐      ┌───────▼────────┐
        │   Frontend UI   │      │   Backend API  │
        │   (Port 8080)   │      │   (Port 3000)  │
        │                 │      │                │
        │  - React SPA    │      │  - Express.js  │
        │  - Vite         │      │  - REST API    │
        │  - Tailwind CSS │      │  - Auth/Admin  │
        │  - i18next      │      │  - Scheduler   │
        └─────────────────┘      └────────┬───────┘
                                          │
                                 ┌────────▼────────┐
                                 │    Database     │
                                 │  (Port 5432)    │
                                 │                 │
                                 │   PostgreSQL    │
                                 │   Prisma ORM    │
                                 └─────────────────┘
```

### Request Flow

```
User → Frontend → Backend API → Database
                ↓
            JWT Auth
                ↓
            Middleware
                ↓
            Controller
                ↓
            Service
                ↓
            Repository
```

## Components and Interfaces

### 1. Authentication Service

**File:** `src/services/auth.ts`

**Responsibilities:**
- User registration with email confirmation
- User login with JWT token generation
- Password reset flow
- Email confirmation
- Token refresh

**Key Methods:**
```typescript
interface AuthService {
  register(username: string, password: string): Promise<Account>;
  login(username: string, password: string): Promise<{ token: string; user: UserData }>;
  confirmEmail(token: string): Promise<void>;
  requestPasswordReset(username: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  refreshToken(accountId: string): Promise<{ token: string; user: UserData }>;
}
```

**Security Features:**
- bcrypt password hashing (10 rounds)
- JWT token generation with 24-hour expiration
- Secure token generation using crypto.randomBytes
- Token expiration validation
- Account activation requirement

### 2. Profile Service

**File:** `src/services/profile.ts` (integrated in auth.ts)

**Responsibilities:**
- Profile retrieval
- Password change
- Email change with confirmation
- Account deletion
- Data export

**Key Methods:**
```typescript
interface ProfileService {
  getProfile(accountId: string): Promise<Account>;
  changePassword(accountId: string, currentPassword: string, newPassword: string): Promise<void>;
  requestEmailChange(accountId: string, newEmail: string, password: string): Promise<void>;
  confirmEmailChange(token: string): Promise<void>;
  deleteAccount(accountId: string, password: string): Promise<void>;
  exportData(accountId: string): Promise<object>;
}
```

### 3. Admin Service

**File:** `src/services/admin.ts`

**Responsibilities:**
- User management (list, get, update, delete)
- Role assignment
- Tier assignment
- Password setting
- Limit override management

**Key Methods:**
```typescript
interface AdminService {
  listUsers(page: number, limit: number): Promise<{ users: Account[]; pagination: Pagination }>;
  getUser(userId: string): Promise<Account>;
  updateUser(userId: string, updates: Partial<Account>): Promise<Account>;
  deleteUser(userId: string, adminId: string): Promise<void>;
  setUserPassword(userId: string, newPassword: string): Promise<void>;
}
```

**Access Control:**
- All methods require admin role
- Admins cannot modify their own admin status
- Admins cannot delete their own account

### 4. Tier Service

**File:** `src/services/tierService.ts`

**Responsibilities:**
- Tier limit retrieval
- Usage tracking
- Limit override management
- Override expiration cleanup

**Key Methods:**
```typescript
interface TierService {
  getLimit(accountId: string, limitName: string): Promise<number>;
  recordUsage(accountId: string, limitName: string, value: number): Promise<void>;
  setOverride(accountId: string, limitName: string, value: number, expiresAt?: Date): Promise<void>;
  removeOverride(accountId: string, limitName: string): Promise<void>;
  cleanupExpiredOverrides(): Promise<number>;
}
```

**Tier Configuration:**
```json
{
  "starter": {
    "displayName": "Starter",
    "limits": {
      "maxUsers": 5,
      "maxStorage": 1073741824
    }
  },
  "pro": {
    "displayName": "Pro",
    "limits": {
      "maxUsers": 25,
      "maxStorage": 10737418240
    }
  },
  "business": {
    "displayName": "Business",
    "limits": {
      "maxUsers": 100,
      "maxStorage": 107374182400
    }
  },
  "enterprise": {
    "displayName": "Enterprise",
    "limits": {
      "maxUsers": -1,
      "maxStorage": -1
    }
  }
}
```

### 5. Banner System

**Files:** `src/services/notificationService.ts`, `src/controllers/banner.ts`

**Responsibilities:**
- Banner creation, update, deletion
- Active banner retrieval with audience filtering
- Banner dismissal tracking
- Scheduled banner management

**Key Methods:**
```typescript
interface BannerService {
  getActiveBanners(accountId?: string, role?: string): Promise<Banner[]>;
  dismissBanner(bannerId: string, accountId: string): Promise<void>;
  createBanner(data: BannerData): Promise<Banner>;
  updateBanner(bannerId: string, data: Partial<BannerData>): Promise<Banner>;
  deleteBanner(bannerId: string): Promise<void>;
}
```

**Banner Types:**
- info (blue)
- warning (yellow)
- error (red)
- success (green)

**Audience Types:**
- public (all users)
- authenticated (logged-in users)
- admin (admin users only)

### 6. SSE Service

**File:** `src/services/sseService.ts`

**Responsibilities:**
- Server-Sent Events connection management
- Real-time banner broadcasting
- Toast notification delivery
- Connection cleanup

**Key Methods:**
```typescript
interface SSEService {
  addClient(accountId: string | null, res: Response): void;
  removeClient(accountId: string | null, res: Response): void;
  broadcastBanner(banner: Banner): void;
  sendToast(accountId: string, message: string, type: string): void;
}
```

**Event Types:**
- banner: New banner notification
- toast: Toast notification

### 7. Task Scheduler

**Files:** `src/scheduler/`

**Components:**
- **CronManager**: Manages cron job scheduling and execution
- **TaskRegistry**: Registers and validates task definitions
- **TaskExecutor**: Executes tasks with error handling
- **TaskStatusRepository**: Tracks task execution history

**Key Interfaces:**
```typescript
interface Task {
  name: string;
  schedule: string; // cron expression
  execute: () => Promise<void>;
}

interface TaskStatus {
  taskName: string;
  enabled: boolean;
  lastRun: Date | null;
  nextRun: Date | null;
  lastResult: 'success' | 'failure' | null;
  lastError: string | null;
  lastDuration: number | null;
}
```

**Built-in Tasks:**
- Example task (every minute)
- Override cleanup task (daily at midnight)

### 8. Email Service

**File:** `src/services/email.ts`

**Responsibilities:**
- SMTP email sending
- Handlebars template rendering
- Localized email templates
- Email error handling

**Key Methods:**
```typescript
interface EmailService {
  sendConfirmationEmail(email: string, token: string, language: string): Promise<void>;
  sendPasswordResetEmail(email: string, token: string, language: string): Promise<void>;
  sendEmailChangeConfirmation(email: string, token: string, language: string): Promise<void>;
}
```

**Email Templates:**
- `email-confirmation.hbs`: Account activation
- `password-reset.hbs`: Password reset
- `email-change-confirmation.hbs`: Email change confirmation

### 9. Localization System

**Backend:** `src/i18n/config.ts`
**Frontend:** `frontend/src/i18n/config.ts`

**Responsibilities:**
- Multi-language support (English, German)
- Browser language detection
- User language preference persistence
- Translation key management
- Fallback to English for missing keys

**Translation Structure:**
```
Backend:
src/locales/
  en/
    errors.json
    validation.json
    emails.json
  de/
    errors.json
    validation.json
    emails.json

Frontend:
frontend/public/locales/
  en/
    common.json
    pages.json
    errors.json
  de/
    common.json
    pages.json
    errors.json
```

### 10. Middleware

**Authentication Middleware** (`src/middleware/jwtAuth.ts`):
- JWT token extraction and verification
- User data attachment to request
- Role-based access control

**Rate Limiter** (`src/middleware/rateLimiter.ts`):
- Request rate limiting per IP/user
- Configurable limits per endpoint
- HTTP 429 responses

**Error Handler** (`src/middleware/errorHandler.ts`):
- Centralized error handling
- Consistent error response format
- Error logging
- Localized error messages

**Language Detection** (`src/middleware/languageDetection.ts`):
- Accept-Language header parsing
- User language preference
- i18next language setting

### 11. Database Models

**Prisma Schema** (`prisma/schema.prisma`):

**Core Models:**
- `Account`: User accounts with authentication
- `EmailConfirmationToken`: Email verification tokens
- `PasswordResetToken`: Password reset tokens
- `EmailChangeToken`: Email change tokens

**Tier System:**
- `UsageRecord`: Usage tracking for limits
- `LimitOverride`: Custom limit overrides per account

**Notification System:**
- `Banner`: System-wide notification banners
- `BannerDismissal`: User banner dismissal tracking

**Scheduler:**
- `ScheduledTaskStatus`: Task execution tracking

**Enums:**
- `AccountTier`: starter, pro, business, enterprise
- `AccountRole`: admin, account_owner, account_user

### 12. Frontend Components

**Authentication Components:**
- `Login.tsx`: Login form
- `SignUp.tsx`: Registration form
- `ForgotPassword.tsx`: Password reset request
- `ResetPassword.tsx`: Password reset form
- `ConfirmEmail.tsx`: Email confirmation handler
- `ConfirmEmailChange.tsx`: Email change confirmation

**Profile Components:**
- `Profile.tsx`: User profile page
- `ChangePassword.tsx`: Password change form

**Admin Components:**
- `Admin.tsx`: Admin panel with tabs
- `UserEditModal.tsx`: User editing modal
- `AdminBannerManager.tsx`: Banner management
- `ScheduledTasksTab.tsx`: Task monitoring

**Navigation Components:**
- `Navigation.tsx`: Main navigation bar
- `BurgerMenu.tsx`: Mobile menu
- `UserDropdown.tsx`: User menu dropdown
- `LanguageSelector.tsx`: Language switcher

**Notification Components:**
- `Banner.tsx`: Banner display
- `BannerContainer.tsx`: Banner container with SSE
- `Toast.tsx`: Toast notification
- `ToastContainer.tsx`: Toast container

**Utility Components:**
- `ProtectedRoute.tsx`: Authentication guard
- `PublicRoute.tsx`: Public route wrapper
- `ErrorBoundary.tsx`: Error boundary
- `PasswordInput.tsx`: Password input with visibility toggle

### 13. Frontend Hooks

**useSSE** (`frontend/src/hooks/useSSE.ts`):
- Server-Sent Events connection management
- Event listener registration
- Automatic reconnection

**useViewport** (`frontend/src/hooks/useViewport.ts`):
- Responsive viewport detection
- Mobile/tablet/desktop breakpoints

**useDocumentTitle** (`frontend/src/hooks/useDocumentTitle.ts`):
- Dynamic document title updates
- Localized page titles

## Data Models

### Account Model

```typescript
interface Account {
  id: string; // UUID
  username: string; // Email address
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  role: 'admin' | 'account_owner' | 'account_user';
  language: string; // 'en' | 'de'
  firstName: string | null;
  lastName: string | null;
  tier: 'starter' | 'pro' | 'business' | 'enterprise';
}
```

### Banner Model

```typescript
interface Banner {
  id: string; // UUID
  key: string | null;
  accountId: string | null;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  dismissable: boolean;
  audience: 'public' | 'authenticated' | 'admin';
  linkText: string | null;
  linkUrl: string | null;
  linkExternal: boolean;
  linkStyle: string | null;
  backgroundColor: string | null;
  textColor: string | null;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### Usage Record Model

```typescript
interface UsageRecord {
  id: string; // UUID
  accountId: string;
  limitName: string;
  value: number;
  periodStart: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Limit Override Model

```typescript
interface LimitOverride {
  id: string; // UUID
  accountId: string;
  limitName: string;
  overrideValue: number;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Password Hashing Consistency

*For any* valid password string, hashing it with bcrypt should produce a hash that can be verified against the original password

**Validates: Requirements 1.4**

### Property 2: JWT Token Round Trip

*For any* valid account data, encoding it into a JWT token and then decoding should produce equivalent account data

**Validates: Requirements 2.3**

### Property 3: Email Token Expiration

*For any* email confirmation token, if the current time is after the expiration time, the token should be rejected

**Validates: Requirements 1.7, 3.3**

### Property 4: Cascade Delete Integrity

*For any* account deletion, all related records (tokens, usage, overrides, dismissals) should be deleted

**Validates: Requirements 5.2**

### Property 5: Tier Limit Override Priority

*For any* account with a limit override, the override value should be returned instead of the tier's default limit

**Validates: Requirements 7.4**

### Property 6: Banner Audience Filtering

*For any* user role, only banners matching their audience type should be returned

**Validates: Requirements 8.4**

### Property 7: Banner Schedule Filtering

*For any* current time, only banners with start date before and end date after the current time should be active

**Validates: Requirements 8.5**

### Property 8: Banner Dismissal Exclusion

*For any* user who has dismissed a banner, that banner should not appear in their active banners list

**Validates: Requirements 8.7**

### Property 9: Task Execution Isolation

*For any* task that fails, other tasks should continue to execute normally

**Validates: Requirements 10.6**

### Property 10: Language Fallback

*For any* missing translation key, the English translation should be returned

**Validates: Requirements 11.5**

### Property 11: Admin Self-Modification Prevention

*For any* admin user, they should not be able to modify their own admin status or delete their own account

**Validates: Requirements 6.4, 6.6**

### Property 12: Rate Limit Enforcement

*For any* IP address or user, exceeding the rate limit should result in HTTP 429 responses

**Validates: Requirements 14.3**

### Property 13: Token Invalidation on Email Change

*For any* email change confirmation, all existing JWT tokens should become invalid

**Validates: Requirements 4.9**

### Property 14: Override Expiration Cleanup

*For any* limit override with an expiration date in the past, it should be removed by the cleanup task

**Validates: Requirements 7.6**

### Property 15: Responsive Breakpoint Consistency

*For any* viewport width, the UI should use the correct layout (mobile, tablet, or desktop)

**Validates: Requirements 19.3, 19.4**

## Error Handling

### Error Response Format

All API errors follow this consistent format:

```typescript
interface ErrorResponse {
  error: string; // Localized error message
  code?: string; // Error code for programmatic handling
  details?: object; // Additional error details
}
```

### HTTP Status Codes

- `200 OK`: Successful request
- `201 Created`: Resource created
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Authentication required or failed
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource already exists
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### Error Logging

All errors are logged with:
- Timestamp
- Error message
- Stack trace
- Request context (method, path, user)
- Error level (error, warn, info, debug)

## Testing Strategy

### Unit Tests

**Backend:**
- Service layer tests with mocked repositories
- Controller tests with mocked services
- Middleware tests with mocked requests
- Utility function tests

**Frontend:**
- Component tests with React Testing Library
- Hook tests with renderHook
- Utility function tests
- API client tests with mocked fetch

### Property-Based Tests

**Backend:**
- Password hashing and verification (fast-check)
- JWT token encoding/decoding (fast-check)
- Email token expiration validation (fast-check)
- Tier limit calculations (fast-check)
- Banner filtering logic (fast-check)

**Frontend:**
- Responsive breakpoint detection (fast-check)
- Language fallback behavior (fast-check)
- Form validation (fast-check)

**Configuration:**
- Minimum 100 iterations per property test
- Each test tagged with feature name and property number
- Example: `// Feature: saas-starter-template, Property 1: Password Hashing Consistency`

### Integration Tests

- Authentication flow (register → confirm → login)
- Password reset flow (request → reset)
- Email change flow (request → confirm)
- Admin user management flow
- Banner creation and display flow
- Task scheduler execution

### End-to-End Tests

- User registration and login
- Profile management
- Admin panel operations
- Banner notifications
- Language switching

### Test Coverage Goals

- Backend: >80% code coverage
- Frontend: >70% code coverage
- Critical paths: 100% coverage

## Security Considerations

### Authentication Security

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens signed with secret key
- Token expiration enforced
- Account activation required
- Password reset tokens expire in 1 hour
- Email confirmation tokens expire in 24 hours

### Authorization Security

- Role-based access control
- Admin-only endpoints protected
- User can only access own data
- Admins cannot modify own admin status

### Input Validation

- Zod schema validation for all inputs
- Email format validation
- Password strength requirements
- SQL injection prevention (Prisma ORM)
- XSS prevention (React escaping)

### Rate Limiting

- Authentication endpoints: 5 requests per 15 minutes
- General endpoints: 100 requests per 15 minutes
- Configurable per endpoint

### CORS Configuration

- Allowed origins configurable
- Credentials support enabled
- Preflight request handling

### Environment Security

- Secrets in environment variables
- No hardcoded credentials
- JWT secret minimum 32 characters
- Database password required

## Performance Optimization

### Backend

- Database connection pooling
- Query optimization with indexes
- Async/await for I/O operations
- Response caching where appropriate
- Batch operations for bulk updates

### Frontend

- Code splitting with React.lazy
- Lazy loading of routes
- Asset compression (gzip)
- CDN for static assets
- React.memo for expensive components
- Debounced API calls

### Database

- Indexes on frequently queried fields
- UUID primary keys for distribution
- Cascade deletes for cleanup
- Efficient foreign key constraints

## Deployment

### Docker Compose

Three services:
1. **Database** (PostgreSQL 16)
2. **Backend** (Node.js 20 + Express)
3. **Frontend** (Nginx + React)

### Environment Variables

**Backend:**
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: JWT signing secret
- `BASE_URL`: Public application URL
- `API_BASE_URL`: API base URL
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode
- `LOG_LEVEL`: Logging verbosity
- `SMTP_*`: Email configuration

**Frontend:**
- `API_BASE_URL`: Backend API URL

### Health Checks

- Backend: `GET /health`
- Database: Connection check
- Frontend: HTTP 200 response

### Logging

- Winston structured logging
- Log levels: error, warn, info, debug
- Console output in development
- File output in production

### Monitoring

- Request/response logging
- Error tracking
- Task execution monitoring
- Database query performance

## Extensibility

### Adding New Features

1. Define database models in Prisma schema
2. Create migrations
3. Implement service layer
4. Create controllers and routes
5. Add frontend components and pages
6. Write tests

### Adding New Languages

1. Add translation files in `src/locales/{lang}/`
2. Add translation files in `frontend/public/locales/{lang}/`
3. Update language selector
4. Add language to supported languages list

### Adding New Tiers

1. Update `src/config/account-tiers.json`
2. Update Prisma enum
3. Create migration
4. Update pricing page

### Adding New Tasks

1. Create task file in `src/tasks/`
2. Implement task interface
3. Register task in `src/server.ts`

## Conclusion

The SaaS Starter Template provides a solid foundation for building production-ready SaaS applications. The architecture is clean, scalable, and maintainable, with comprehensive features for authentication, user management, admin operations, tier management, notifications, and internationalization. All components are well-tested, documented, and ready for customization.
