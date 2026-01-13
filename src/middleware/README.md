# Middleware Documentation

## JWT Authentication Middleware

### `authenticateToken`

Validates JWT tokens from the Authorization header for protected routes.

**Usage:**
```typescript
import { authenticateToken, AuthRequest } from '../middleware/jwtAuth';

router.get('/protected', authenticateToken, (req: AuthRequest, res) => {
  // Access authenticated user info
  const accountId = req.account?.id;
  const username = req.account?.username;
  
  res.json({ message: 'Protected resource', accountId, username });
});
```

**Behavior:**
- Extracts JWT token from `Authorization: Bearer <token>` header
- Verifies token signature and expiration
- Adds `account` object to request with `id` and `username`
- Returns 401 if token is missing or invalid
- Logs authentication attempts

### `optionalAuth`

Attempts to authenticate but allows requests to proceed without valid tokens.

**Usage:**
```typescript
import { optionalAuth, AuthRequest } from '../middleware/jwtAuth';

router.get('/public', optionalAuth, (req: AuthRequest, res) => {
  if (req.account) {
    // User is authenticated - provide enhanced response
    res.json({ message: 'Hello ' + req.account.username });
  } else {
    // User is not authenticated - provide basic response
    res.json({ message: 'Hello guest' });
  }
});
```

**Behavior:**
- Extracts JWT token from `Authorization: Bearer <token>` header if present
- Verifies token and adds `account` to request if valid
- Continues without authentication if token is missing or invalid
- Useful for routes that have enhanced functionality for authenticated users

## AuthRequest Interface

Extended Express Request type that includes account information:

```typescript
interface AuthRequest extends Request {
  account?: {
    id: string;
    username: string;
  };
}
```

Use this type in route handlers that use JWT authentication middleware.
