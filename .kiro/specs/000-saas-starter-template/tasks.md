# Implementation Plan: SaaS Starter Template

## Overview

This document outlines the complete implementation of the SaaS Starter Template. All tasks listed here have been completed and represent the current state of the application.

## Tasks

- [x] 1. Project Setup and Infrastructure
  - Set up project structure with TypeScript
  - Configure Docker and Docker Compose
  - Set up PostgreSQL database
  - Configure Prisma ORM
  - Set up environment variables
  - Configure logging with Winston
  - Set up testing frameworks (Jest, Vitest)
  - _Requirements: 17.1, 17.2, 20.1, 20.2, 20.3_

- [x] 2. Database Schema and Models
  - [x] 2.1 Define Prisma schema with all models
    - Create Account model with enums for tier and role
    - Create EmailConfirmationToken model
    - Create PasswordResetToken model
    - Create EmailChangeToken model
    - Create UsageRecord model
    - Create LimitOverride model
    - Create Banner model
    - Create BannerDismissal model
    - Create ScheduledTaskStatus model
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7_

  - [x] 2.2 Create initial migration
    - Generate Prisma migration
    - Apply migration to database
    - _Requirements: 17.1_

  - [x] 2.3 Set up database client
    - Configure Prisma client
    - Set up connection pooling
    - _Requirements: 17.1_

- [x] 3. Authentication System
  - [x] 3.1 Implement user registration
    - Create registration endpoint
    - Validate email and password
    - Hash password with bcrypt
    - Create inactive account
    - Generate email confirmation token
    - Send confirmation email
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [x] 3.2 Implement email confirmation
    - Create email confirmation endpoint
    - Validate token and expiration
    - Activate account
    - Delete used token
    - _Requirements: 1.8_

  - [x] 3.3 Implement user login
    - Create login endpoint
    - Verify credentials
    - Check account is active
    - Generate JWT token
    - Return token and user data
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 3.4 Implement password reset
    - Create forgot password endpoint
    - Generate reset token
    - Send reset email
    - Create reset password endpoint
    - Validate token and expiration
    - Update password hash
    - Invalidate token
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 3.5 Implement token refresh
    - Create refresh endpoint
    - Validate existing token
    - Generate new token
    - _Requirements: 2.8_

  - [x] 3.6 Implement JWT authentication middleware
    - Extract token from Authorization header
    - Verify token signature
    - Attach user data to request
    - Handle invalid/expired tokens
    - Support role-based access control
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

- [x] 4. Profile Management
  - [x] 4.1 Implement profile retrieval
    - Create profile endpoint
    - Return account information
    - Exclude password hash
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 4.2 Implement password change
    - Create change password endpoint
    - Verify current password
    - Validate new password
    - Update password hash
    - _Requirements: 4.4, 4.5_

  - [x] 4.3 Implement email change
    - Create request email change endpoint
    - Verify current password
    - Generate email change token
    - Send confirmation email
    - Create confirm email change endpoint
    - Update username
    - Invalidate JWT tokens
    - _Requirements: 4.6, 4.7, 4.8, 4.9_

  - [x] 4.4 Implement account deletion
    - Create delete account endpoint
    - Verify password
    - Delete account with cascade
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 4.5 Implement data export
    - Create export endpoint
    - Gather all user data
    - Generate JSON file
    - Return file to client
    - _Requirements: 5.4, 5.5, 5.6_

- [x] 5. Admin Panel
  - [x] 5.1 Implement user list endpoint
    - Create list users endpoint
    - Support pagination
    - Support filtering and sorting
    - Require admin role
    - _Requirements: 6.1, 6.2, 6.8_

  - [x] 5.2 Implement user details endpoint
    - Create get user endpoint
    - Return full user information
    - Include limit overrides
    - Require admin role
    - _Requirements: 6.8_

  - [x] 5.3 Implement user update endpoint
    - Create update user endpoint
    - Validate role and tier
    - Prevent self-modification of admin status
    - Require admin role
    - _Requirements: 6.3, 6.4, 6.8_

  - [x] 5.4 Implement user deletion endpoint
    - Create delete user endpoint
    - Prevent self-deletion
    - Cascade delete related data
    - Require admin role
    - _Requirements: 6.5, 6.6, 6.8_

  - [x] 5.5 Implement set password endpoint
    - Create set password endpoint
    - Hash new password
    - Require admin role
    - _Requirements: 6.7, 6.8_

- [x] 6. Tier System
  - [x] 6.1 Create tier configuration
    - Define tier limits in JSON file
    - Support four tiers (starter, pro, business, enterprise)
    - _Requirements: 7.1, 7.2_

  - [x] 6.2 Implement tier service
    - Create getLimit method
    - Check for limit overrides
    - Validate override expiration
    - Return tier default or override
    - _Requirements: 7.3, 7.4, 7.5_

  - [x] 6.3 Implement usage tracking
    - Create recordUsage method
    - Update or create usage records
    - _Requirements: 7.6, 7.7_

  - [x] 6.4 Implement limit override management
    - Create setOverride method
    - Create removeOverride method
    - Support time-bound overrides
    - _Requirements: 7.8_

  - [x] 6.5 Implement override cleanup task
    - Create cleanup task
    - Remove expired overrides
    - Schedule daily execution
    - _Requirements: 7.6_

- [x] 7. Banner System
  - [x] 7.1 Implement banner creation
    - Create banner endpoint
    - Validate message, type, audience
    - Support scheduling
    - Require admin role
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 7.2 Implement active banners endpoint
    - Create get banners endpoint
    - Filter by audience
    - Filter by schedule
    - Exclude dismissed banners
    - Support authenticated and unauthenticated users
    - _Requirements: 8.4, 8.5, 8.6_

  - [x] 7.3 Implement banner dismissal
    - Create dismiss banner endpoint
    - Record dismissal
    - Require authentication
    - _Requirements: 8.7_

  - [x] 7.4 Implement banner management endpoints
    - Create list all banners endpoint (admin)
    - Create update banner endpoint (admin)
    - Create delete banner endpoint (admin)
    - _Requirements: 8.1_

  - [x] 7.5 Add banner link support
    - Support optional links in banners
    - Support external/internal links
    - Support link styling
    - _Requirements: 8.8_

- [x] 8. Real-time Notifications
  - [x] 8.1 Implement SSE service
    - Create SSE connection management
    - Support client registration
    - Support client cleanup
    - _Requirements: 9.1, 9.6_

  - [x] 8.2 Implement banner broadcasting
    - Send active banners on connection
    - Broadcast new banners to clients
    - _Requirements: 9.2, 9.3_

  - [x] 8.3 Implement toast notifications
    - Create toast endpoint
    - Send toast to specific user
    - _Requirements: 9.4_

  - [x] 8.4 Support authenticated and unauthenticated SSE
    - Handle connections with and without JWT
    - Filter content based on authentication
    - _Requirements: 9.5_

- [x] 9. Task Scheduler
  - [x] 9.1 Implement task framework
    - Create CronManager
    - Create TaskRegistry
    - Create TaskExecutor
    - Create TaskStatusRepository
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

  - [x] 9.2 Implement cron expression parsing
    - Calculate next run times
    - Validate cron expressions
    - _Requirements: 10.2, 10.3_

  - [x] 9.3 Implement task execution
    - Execute tasks asynchronously
    - Record execution status
    - Log errors
    - Isolate task failures
    - _Requirements: 10.4, 10.5, 10.6_

  - [x] 9.4 Create example tasks
    - Create example task
    - Create override cleanup task
    - _Requirements: 10.1_

  - [x] 9.5 Add task monitoring
    - Track last run time
    - Track next run time
    - Track execution duration
    - Track success/failure
    - _Requirements: 10.8_

- [x] 10. Internationalization
  - [x] 10.1 Set up backend i18n
    - Configure i18next
    - Create translation files (English, German)
    - Add language detection middleware
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 10.2 Set up frontend i18n
    - Configure i18next
    - Create translation files (English, German)
    - Implement browser language detection
    - Implement language persistence
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.8_

  - [x] 10.3 Implement language fallback
    - Fall back to English for missing keys
    - _Requirements: 11.5_

  - [x] 10.4 Implement context-based translations
    - Support context parameter in translations
    - _Requirements: 11.6_

  - [x] 10.5 Implement locale formatting
    - Format dates, numbers, currencies
    - _Requirements: 11.7_

  - [x] 10.6 Create language selector component
    - Add language dropdown to navigation
    - Update language on selection
    - Persist preference
    - _Requirements: 11.3, 11.8_

  - [x] 10.7 Localize email templates
    - Create Handlebars helper for translations
    - Localize all email templates
    - _Requirements: 12.3, 12.4, 12.5, 12.6_

- [x] 11. Email Service
  - [x] 11.1 Implement email service
    - Configure SMTP with Nodemailer
    - Support environment variable configuration
    - _Requirements: 12.1_

  - [x] 11.2 Create email templates
    - Create Handlebars templates
    - Create confirmation email template
    - Create password reset template
    - Create email change template
    - _Requirements: 12.2, 12.4, 12.5, 12.6_

  - [x] 11.3 Implement email sending methods
    - Send confirmation email
    - Send password reset email
    - Send email change confirmation
    - Log email success/failure
    - _Requirements: 12.4, 12.5, 12.6, 12.7_

  - [x] 11.4 Add base URL to email links
    - Include application URL in emails
    - _Requirements: 12.8_

- [x] 12. Middleware and Error Handling
  - [x] 12.1 Implement rate limiting
    - Create rate limiter middleware
    - Configure limits per endpoint
    - Return HTTP 429 on limit exceeded
    - Include rate limit headers
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [x] 12.2 Implement error handler
    - Create centralized error handler
    - Return consistent error format
    - Log errors with stack traces
    - Support localized errors
    - Protect sensitive information
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

  - [x] 12.3 Implement logging
    - Configure Winston logger
    - Support log levels
    - Log to console in development
    - Include timestamps
    - Log authentication events
    - Log API requests
    - Log database errors
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7_

  - [x] 12.4 Implement language detection
    - Parse Accept-Language header
    - Check user language preference
    - Set i18next language
    - _Requirements: 11.2_

- [x] 13. Frontend Setup
  - [x] 13.1 Set up React application
    - Configure Vite
    - Configure TypeScript
    - Configure Tailwind CSS
    - Set up routing with React Router
    - _Requirements: 19.1_

  - [x] 13.2 Set up API client
    - Create API client with fetch
    - Add JWT token handling
    - Add error handling
    - _Requirements: 18.2_

  - [x] 13.3 Implement authentication context
    - Create auth context
    - Store JWT in localStorage
    - Provide login/logout methods
    - _Requirements: 18.1, 18.5_

  - [x] 13.4 Implement protected routes
    - Create ProtectedRoute component
    - Redirect unauthenticated users
    - _Requirements: 18.3_

  - [x] 13.5 Implement public routes
    - Create PublicRoute component
    - Redirect authenticated users
    - _Requirements: 18.4_

  - [x] 13.6 Handle token expiration
    - Detect expired tokens
    - Clear tokens and redirect to login
    - _Requirements: 18.6_

- [x] 14. Frontend Authentication Pages
  - [x] 14.1 Create login page
    - Build login form
    - Validate inputs
    - Call login API
    - Store JWT token
    - Redirect to dashboard
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 14.2 Create sign up page
    - Build registration form
    - Validate email and password
    - Call registration API
    - Show confirmation message
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 14.3 Create email confirmation page
    - Extract token from URL
    - Call confirmation API
    - Show success/error message
    - _Requirements: 1.8_

  - [x] 14.4 Create forgot password page
    - Build forgot password form
    - Call forgot password API
    - Show confirmation message
    - _Requirements: 3.1, 3.2_

  - [x] 14.5 Create reset password page
    - Extract token from URL
    - Build reset password form
    - Call reset password API
    - Redirect to login
    - _Requirements: 3.4, 3.5, 3.6, 3.7_

- [x] 15. Frontend Profile Pages
  - [x] 15.1 Create profile page
    - Display user information
    - Add change password link
    - Add change email button
    - Add download data button
    - Add delete account button
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 15.2 Create change password page
    - Build change password form
    - Validate passwords
    - Call change password API
    - Show success message
    - _Requirements: 4.4, 4.5_

  - [x] 15.3 Implement email change flow
    - Add email change modal
    - Verify password
    - Call request email change API
    - Create email change confirmation page
    - _Requirements: 4.6, 4.7, 4.8, 4.9_

  - [x] 15.4 Implement data export
    - Call export API
    - Download JSON file
    - _Requirements: 5.4, 5.5, 5.6_

  - [x] 15.5 Implement account deletion
    - Add confirmation modal
    - Verify password
    - Call delete account API
    - Logout and redirect
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 16. Frontend Admin Panel
  - [x] 16.1 Create admin page
    - Build admin panel layout
    - Add tabs for users, banners, tasks
    - Require admin role
    - _Requirements: 6.8_

  - [x] 16.2 Create user management tab
    - Display user list with pagination
    - Add search and filters
    - Add edit user modal
    - Add delete user button
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 16.3 Create user edit modal
    - Edit role and tier
    - Edit first and last name
    - Set account status
    - Set password
    - Manage limit overrides
    - _Requirements: 6.3, 6.4, 6.7_

  - [x] 16.4 Create banner management tab
    - Display banner list
    - Add create banner form
    - Add edit banner button
    - Add delete banner button
    - _Requirements: 8.1_

  - [x] 16.5 Create scheduled tasks tab
    - Display task list
    - Show task status
    - Show last run and next run
    - Add manual trigger button
    - _Requirements: 10.7, 10.8_

- [x] 17. Frontend Navigation and Layout
  - [x] 17.1 Create navigation component
    - Build responsive navigation bar
    - Add logo and branding
    - Add navigation links
    - Add user dropdown
    - Add language selector
    - _Requirements: 19.1, 19.2, 19.3, 19.4_

  - [x] 17.2 Create burger menu for mobile
    - Build mobile menu
    - Add hamburger button
    - Support touch interactions
    - _Requirements: 19.3, 19.5_

  - [x] 17.3 Create user dropdown
    - Display user avatar
    - Show user menu
    - Add profile link
    - Add admin link (for admins)
    - Add logout button
    - _Requirements: 19.1_

  - [x] 17.4 Create language selector
    - Display current language
    - Show language dropdown
    - Switch language on selection
    - Persist preference
    - _Requirements: 11.3, 11.8_

  - [x] 17.5 Create footer component
    - Add footer with links
    - Add legal, privacy, terms links
    - _Requirements: 19.1_

- [x] 18. Frontend Notification Components
  - [x] 18.1 Create banner component
    - Display banner message
    - Support banner types (info, warning, error, success)
    - Add dismiss button
    - Support links
    - _Requirements: 8.1, 8.2, 8.3, 8.7, 8.8_

  - [x] 18.2 Create banner container
    - Connect to SSE
    - Display active banners
    - Handle banner dismissal
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 18.3 Create toast component
    - Display toast notification
    - Support toast types
    - Auto-dismiss after timeout
    - _Requirements: 9.4_

  - [x] 18.4 Create toast container
    - Connect to SSE
    - Display toast notifications
    - Stack multiple toasts
    - _Requirements: 9.4_

- [x] 19. Frontend Hooks and Utilities
  - [x] 19.1 Create useSSE hook
    - Establish SSE connection
    - Register event listeners
    - Handle reconnection
    - Clean up on unmount
    - _Requirements: 9.1, 9.5, 9.6_

  - [x] 19.2 Create useViewport hook
    - Detect viewport size
    - Return mobile/tablet/desktop
    - Update on resize
    - _Requirements: 19.2, 19.3, 19.4_

  - [x] 19.3 Create useDocumentTitle hook
    - Update document title
    - Support localized titles
    - _Requirements: 11.8_

  - [x] 19.4 Create auth utilities
    - Get token from localStorage
    - Set token in localStorage
    - Remove token from localStorage
    - Decode JWT token
    - _Requirements: 18.1, 18.5_

- [x] 20. Frontend Public Pages
  - [x] 20.1 Create welcome page
    - Build landing page
    - Add call-to-action buttons
    - Add feature highlights
    - _Requirements: 19.1_

  - [x] 20.2 Create pricing page
    - Display tier information
    - Show tier limits
    - Add sign up buttons
    - _Requirements: 7.1, 7.2_

  - [x] 20.3 Create legal pages
    - Create legal page
    - Create privacy page
    - Create terms page
    - _Requirements: 19.1_

- [x] 21. Testing
  - [x] 21.1 Write backend unit tests
    - Test authentication service
    - Test profile service
    - Test admin service
    - Test tier service
    - Test banner service
    - Test email service
    - Test middleware
    - Test controllers
    - _All Requirements_

  - [x] 21.2 Write backend property tests
    - Test password hashing consistency
    - Test JWT token round trip
    - Test email token expiration
    - Test cascade delete integrity
    - Test tier limit override priority
    - Test banner audience filtering
    - Test banner schedule filtering
    - Test banner dismissal exclusion
    - Test task execution isolation
    - Test language fallback
    - Test admin self-modification prevention
    - Test rate limit enforcement
    - Test token invalidation on email change
    - Test override expiration cleanup
    - _All Requirements_

  - [x] 21.3 Write backend integration tests
    - Test authentication flow
    - Test password reset flow
    - Test email change flow
    - Test admin user management
    - Test banner creation and display
    - Test task scheduler execution
    - _All Requirements_

  - [x] 21.4 Write frontend unit tests
    - Test components
    - Test hooks
    - Test utilities
    - Test API client
    - _All Requirements_

  - [x] 21.5 Write frontend property tests
    - Test responsive breakpoint detection
    - Test language fallback behavior
    - Test form validation
    - _All Requirements_

  - [x] 21.6 Write frontend integration tests
    - Test authentication flow
    - Test profile management
    - Test admin panel
    - Test banner notifications
    - Test language switching
    - _All Requirements_

- [x] 22. Documentation
  - [x] 22.1 Write README
    - Document features
    - Document quick start
    - Document usage examples
    - Document customization
    - _All Requirements_

  - [x] 22.2 Write architecture documentation
    - Document system architecture
    - Document components
    - Document data flow
    - Document security
    - _All Requirements_

  - [x] 22.3 Write API documentation
    - Document all endpoints
    - Document request/response formats
    - Document error codes
    - Document authentication
    - _All Requirements_

  - [x] 22.4 Write getting started guide
    - Document installation
    - Document configuration
    - Document first steps
    - Document customization
    - _All Requirements_

  - [x] 22.5 Write deployment guide
    - Document Docker deployment
    - Document environment configuration
    - Document production setup
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6_

  - [x] 22.6 Write testing guide
    - Document test infrastructure
    - Document test helpers
    - Document running tests
    - _All Requirements_

- [x] 23. Production Readiness
  - [x] 23.1 Configure production environment
    - Set up environment variables
    - Configure SMTP for production
    - Configure JWT secret
    - Configure database password
    - _Requirements: 20.3_

  - [x] 23.2 Set up database seeding
    - Create seed script
    - Seed default admin account
    - _Requirements: 6.8_

  - [x] 23.3 Configure Docker for production
    - Optimize Docker images
    - Configure health checks
    - Configure restart policies
    - _Requirements: 20.1, 20.2, 20.6_

  - [x] 23.4 Add security headers
    - Configure CORS
    - Add security headers
    - _Requirements: 13.6_

  - [x] 23.5 Configure logging for production
    - Set up log rotation
    - Configure log levels
    - _Requirements: 16.1, 16.2, 16.3_

## Notes

All tasks have been completed and the application is production-ready. The template provides:

- ✅ Complete authentication system with email confirmation
- ✅ User profile management with email change and account deletion
- ✅ Admin panel for user management
- ✅ Tier system with usage tracking and limit overrides
- ✅ Banner notification system with real-time updates
- ✅ Task scheduler framework for background jobs
- ✅ Multi-language support (English, German)
- ✅ Email service with localized templates
- ✅ Comprehensive testing (unit, property, integration)
- ✅ Complete documentation
- ✅ Docker deployment
- ✅ Production-ready configuration

The application is ready for customization and extension to build your SaaS product.
