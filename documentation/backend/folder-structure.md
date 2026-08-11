# Backend Folder Structure - Complete File Listing

## Root Directory

```
backend/
├── .dockerignore
├── .env
├── .env.example
├── Dockerfile
├── package.json
├── tsconfig.json
├── planned-architecture.md
├── README.md
├── src/
├── tests/
├── supabase/
├── docs/
├── uploads/
├── dist/
└── node_modules/
```

## src/ - Source Code

```
src/
├── app.ts             # Express app setup
├── server.ts          # HTTP server entry point
│
├── bootstrap/         # Dependency injection & routing registry
│   ├── dependencies.ts
│   ├── modules.ts
│   └── routes.ts
│
├── config/            # Configuration management
│   ├── index.ts
│   ├── env.ts
│   ├── cors.ts
│   └── app.config.ts
│
├── middleware/        # Cross-cutting concerns
│   ├── auth.ts        # Auth context resolution & CSRF validation
│   ├── securityHeaders.ts     # Browser security headers
│   ├── rateLimit.ts      # In-process rate limiting
│   ├── errorHandler.ts   # Error serialization & responses
│   ├── upload.ts         # Multipart file constraints
│   └── developerPackageUpload.ts  # Developer-specific upload handling
│
├── types/        # Global TypeScript definitions
│   ├── express.d.ts
│   ├── inspection.ts
│   ├── inspectionCoordinates.ts
│   ├── inspectionPreScan.ts
│   ├── developerDashboard.ts
│   └── reportOrganization.ts
│
├── integrations/  # External service integrations
│   ├── supabaseConfig.ts
│   └── supabase.ts
│
├── shared/ # Cross-cutting layers (domain, application, infrastructure, presentation)
│   ├── domain/
│   │   └── errors/
│   │       └── ApplicationError.ts  # Base error class
│   │
│   ├── application/
│   │   ├── Result.ts      # Result type for use cases
│   │   ├── requestLimits.ts   # Request size/complexity limits
│   │   └── pagination.ts   # Pagination utilities
│   │
│   ├── infrastructure/
│   │   └── supabase/
│   │       └── client.ts   # Supabase client configuration
│   │
│   └── presentation/
│       └── http/
│           └── response.ts  # HTTP response builders
│
└── modules/   # 10 Bounded Contexts (Domain-Driven Design)
    │
    ├── auth/            # Authentication & session management
    │   ├── domain/
    │   │   ├── AuthToken.ts   # Auth token value object
    │   │   └── ports/
    │   │       └── AuthGateway.ts  # Supabase auth abstraction
    │   │
    │   ├── application/  # Use cases
    |   |   ├── signIn
    |   |   |   └── SignInUser.ts
    │   │   ├── BeginPasskeyAuthentication.ts
    │   │   ├── VerifyPasskeyAuthentication.ts
    │   │   ├── BeginPasskeyRegistration.ts
    │   │   ├── VerifyPasskeyRegistration.ts
    │   │   ├── SignUpUser.ts
    │   │   ├── SignOutUser.ts
    │   │   ├── UpdatePassword.ts
    │   │   ├── UpdateRecoveryPassword.ts
    │   │   ├── UpdateEmail.ts
    │   │   ├── SendPasswordReset.ts
    │   │   ├── DeletePasskey.ts
    │   │   └── ListPasskeys.ts
    │   │
    │   ├── infrastructure/             # Supabase adapters & services
    │   │   ├── AppSessionService.ts     # Session cookie management
    │   │   ├── AuthOperationsGateway.ts # Supabase auth operations
    │   │   ├── CsrfTokenService.ts      # CSRF token generation/validation
    │   │   ├── EmailService.ts          # Email sending (SMTP)
    │   │   ├── PasskeyCeremonyStore.ts  # Passkey ceremony state storage
    │   │   ├── PasskeyService.ts        # Passkey operations
    │   │   ├── SessionLimitService.ts   # Device session limits
    │   │   ├── SupabaseAuthFactory.ts   # Supabase auth client factory
    │   │   ├── SupabaseAuthOperations.ts # Supabase auth concrete implementation
    │   │   └── SupabasePasskeyFactory.ts # Passkey factory
    │   │
    │   ├── presentation/
    │   │   ├── routes.ts                # Auth routes
    │   │   ├── controllers/
    │   │   │   └── AuthController.ts
    │   │   ├── views/
    │   │   │   └── AuthView.ts
    │   │   └── sessionCookie.ts     # Session cookie utilities
    │   │
    │   └── index.ts  # Module composition interface
    │
    ├── users/        # User profiles & admin operations
    │   ├── domain/
    │   │   ├── UserId.ts   # User ID value object
    │   │   └── ports/
    │   │       └── UserRepository.ts  # User repository    interface
    │   │
    │   ├── application/     # Use cases
    │   │   ├── GetProfile.ts
    │   │   ├── UpdateProfile.ts
    │   │   ├── CreateAdminUser.ts
    │   │   ├── UpdateAdminUser.ts
    │   │   ├── DeleteAdminUser.ts
    │   │   ├── ListProfiles.ts
    │   │   ├── GetUserStats.ts
    │   │   └── CheckUserRole.ts
    │   │
    │   ├── infrastructure/
    │   │   ├── ProfileService.ts   # Supabase profile operations
    │   │   └── ProfileServiceGateway.ts # Profile repository implementation
    │   │
    │   ├── presentation/
    │   │   ├── routes.ts
    │   │   ├── controllers/
    │   │   │   ├── ProfileController.ts
    │   │   │   └── GetProfileController.ts
    │   │   └── views/
    │   │       └── UserView.ts
    │   │
    │   └── index.ts
    │
    ├── inspections/  # Inspection CRUD & statistics
    │   ├── domain/
    │   │   ├── InspectionId.ts    # Inspection ID value object
    │   │   └── ports/
    │   │       └── InspectionRepository.ts # Inspection repository interface
    │   │
    │   ├── application/  # Use cases
    │   │   ├── CreateInspection.ts
    │   │   ├── GetInspectionById.ts
    │   │   ├── DeleteInspection.ts
    │   │   ├── ListInspections.ts
    │   │   └── GetInspectionStatistics.ts
    │   │
    │   ├── infrastructure/
    │   │   ├── InspectionService.ts  # Supabase inspection operations
    │   │   └── InspectionServiceGateway.ts # Inspection repository implementation
    │   │
    │   ├── presentation/
    │   │   ├── routes.ts
    │   │   ├── controllers/
    │   │   │   ├── InspectionController.ts
    │   │   │   └── GetInspectionController.ts
    │   │   └── views/
    │   │       └── InspectionView.ts
    │   │
    │   └── index.ts
    │
    ├── analysis/  # Image handling & model inference
    │   ├── domain/  # (domain-specific policies if any)
    │   │
    │   ├── application/ # Use cases
    │   │   ├── UploadInspectionImage.ts
    │   │   └── RetiredServerAnalysis.ts # Legacy analysis endpoint
    │   │
    │   ├── infrastructure/  # Storage & inference
    │   │   └── StorageService.ts # Supabase storage operations
    │   │
    │   ├── presentation/
    │   │   ├── routes.ts
    │   │   ├── upload-routes.ts
    │   │   └── controllers/
    │   │       ├── AnalysisController.ts
    │   │       └── UploadController.ts
    │   │
    │   └── index.ts
    │
    ├── access-codes/ # Registration codes
    │   ├── domain/  # (domain-specific rules)
    │   │
    │   ├── application/   # Use cases
    │   │   ├── ValidateAccessCode.ts
    │   │   ├── CreateAccessCode.ts
    │   │   ├── DeleteAccessCode.ts
    │   │   ├── ListAccessCodes.ts
    │   │   └── ToggleAccessCode.ts
    │   │
    │   ├── infrastructure/
    │   │   └── AccessCodeService.ts     # Supabase access code operations
    │   │
    │   ├── presentation/
    │   │   ├── routes.ts
    │   │   └── controllers/
    │   │       └── AccessCodeController.ts
    │   │
    │   └── index.ts
    │
    ├── analytics/  # Landing page & inspection stats
    │   ├── domain/
    │   │   └── ports/
    │   │       └── AnalyticsRepository.ts # Analytics repository interface
    │   │
    │   ├── application/  # Use cases
    │   │   ├── GetLandingPageStats.ts
    │   │   └── GetInspectionStatistics.ts
    │   │
    │   ├── infrastructure/
    │   │   ├── SupabaseAnalyticsRepository.ts # Analytics implementation
    │   │   └── SupabaseAnalyticsFactory.ts
    │   │
    │   ├── presentation/
    │   │   ├── routes.ts
    │   │   ├── controllers/
    │   │   │   ├── StatsController.ts
    │   │   │   └── LandingPageStatsController.ts
    │   │   └── views/
    │   │       └── AnalyticsView.ts
    │   │
    │   └── index.ts
    │
    ├── audit/   # Encrypted audit logging
    │   ├── domain/  # (audit policies)
    │   │
    │   ├── application/  # Use cases
    │   │   ├── WriteAuditLogBatch.ts
    │   │   └── ListAuditLogs.ts
    │   │
    │   ├── infrastructure/
    │   │   └── AuditLogService.ts  # Supabase audit log operations
    │   │
    │   ├── presentation/
    │   │   ├── routes.ts
    │   │   └── controllers/
    │   │       └── AuditLogController.ts
    │   │
    │   └── index.ts
    │
    ├── markets/   # Market & location management
    │   ├── domain/   # (market policies)
    │   │
    │   ├── application/   # Use cases
    │   │   ├── CreateMarketLocation.ts
    │   │   ├── DeleteMarketLocation.ts
    │   │   └── ListMarketLocations.ts
    │   │
    │   ├── infrastructure/
    │   │   └── MarketLocationService.ts # Supabase market operations
    │   │
    │   ├── presentation/
    │   │   ├── routes.ts
    │   │   └── controllers/
    │   │       └── MarketLocationController.ts
    │   │
    │   └── index.ts
    │
    ├── chat/   # Conversations & messaging
    │   ├── domain/
    │   │   └── ports/
    │   │       └── ChatContactRepository.ts # Chat contact repository interface
    │   │
    │   ├── application/  # Use cases
    │   │   ├── ListChatContacts.ts
    │   │   ├── ListConversation.ts
    │   │   ├── ListUserChatContacts.ts
    │   │   └── SendUserChatMessage.ts
    │   │
    │   ├── infrastructure/
    │   │   ├── SupabaseChatContactRepository.ts # Chat contacts implementation
    │   │   ├── SupabaseChatFactory.ts
    │   │   └── UserChatService.ts  # User chat operations
    │   │
    │   ├── presentation/
    │   │   ├── routes.ts
    │   │   ├── user-chat-routes.ts
    │   │   ├── controllers/
    │   │   │   ├── ChatController.ts
    │   │   │   ├── ListChatContactsController.ts
    │   │   │   └── UserChatController.ts
    │   │   └── views/
    │   │       └── ChatView.ts
    │   │
    │   └── index.ts
    │
    └── developer/   # Developer-only features
        ├── domain/    # (developer policies)
        │
        ├── application/  # Use cases
        │   ├── CreateDeveloperUnlockToken.ts
        │   ├── ExportDeveloperDataset.ts
        │   ├── GetDeveloperOverview.ts
        │   ├── ImportTrainingRun.ts
        │   ├── IsDeveloperOptionsConfigured.ts
        │   ├── ListDeveloperDatasets.ts
        │   ├── ListTrainingRuns.ts
        │   ├── UpdateDatasetClassification.ts
        │   ├── VerifyDeveloperPassword.ts
        │   └── VerifyDeveloperUnlockToken.ts
        │
        ├── infrastructure/
        │   ├── DeveloperDashboardService.ts  # Dashboard operations
        │   ├── DeveloperDashboardStorageService.ts # Dataset storage
        │   └── DeveloperOptionsService.ts  # Developer options management
        │
        ├── presentation/
        │   ├── dashboard-routes.ts
        │   ├── options-routes.ts
        │   └── controllers/
        │       ├── DeveloperDashboardController.ts
        │       └── DeveloperOptionsController.ts
        │
        └── index.ts
```

## tests/ - Test Suite

```
tests/
├── setup/      # Test environment setup
│   ├── env.ts       # Environment configuration
│   └── lifecycle.ts   # Test lifecycle management
│
├── support/   # Test utilities & factories
│   ├── appFactory.ts # Express app factory
│   ├── authFactory.ts   # Auth test factory
│   ├── fixtures.ts   # Test fixtures
│   ├── modelFake.ts    # Mock model data
│   ├── requestFactory.ts   # Request factory
│   └── supabaseFake.ts  # Supabase mock
│
├── unit/  # Unit tests (business logic, adapters, value objects)
│   ├── shared/
│   │   ├── application-errors.unit.test.ts
│   │   ├── http-response.unit.test.ts
│   │   ├── pagination.unit.test.ts
│   │   ├── request-limits.unit.test.ts
│   │   ├── result.unit.test.ts
│   │   └── .gitkeep
│   │
│   ├── config/
│   │   ├── app-config.unit.test.ts
│   │   ├── app-session-config.unit.test.ts
│   │   ├── cors-origins.unit.test.ts
│   │   ├── environment.unit.test.ts
│   │   └── supabase-config.unit.test.ts
│   │
│   ├── auth/
│   │   ├── app-session-service.unit.test.ts
│   │   ├── auth-service-gateway.unit.test.ts
│   │   ├── auth-service.unit.test.ts
│   │   ├── auth-view.unit.test.ts
│   │   ├── csrf-token-service.unit.test.ts
│   │   ├── module-app-session-service.unit.test.ts
│   │   ├── module-auth-token.unit.test.ts
│   │   ├── module-csrf-token-service.unit.test.ts
│   │   ├── module-email-service.unit.test.ts
│   │   ├── module-passkey-ceremony-store.unit.test.ts
│   │   ├── module-passkey-service.unit.test.ts
│   │   ├── module-session-limit-service.unit.test.ts
│   │   ├── passkey-ceremony-store.unit.test.ts
│   │   ├── request-auth.unit.test.ts
│   │   ├── session-cookie-security.unit.test.ts
│   │   ├── session-limit-service.unit.test.ts
│   │   ├── sign-in-user.unit.test.ts
│   │   └── supabase-auth-operations.unit.test.ts
│   │
│   ├── users/
│   │   ├── get-profile-controller.unit.test.ts
│   │   ├── get-profile.unit.test.ts
│   │   ├── module-profile-service.unit.test.ts
│   │   ├── profile-service-gateway.unit.test.ts
│   │   └── user-id.unit.test.ts
│   │
│   ├── inspections/
│   │   ├── coordinates.unit.test.ts
│   │   ├── get-inspection-by-id.unit.test.ts
│   │   ├── get-inspection-controller.unit.test.ts
│   │   ├── inspection-id.unit.test.ts
│   │   ├── inspection-service-gateway.unit.test.ts
│   │   ├── module-inspection-service.unit.test.ts
│   │   └── pre-scan.unit.test.ts
│   │
│   ├── analysis/
│   │   └── module-storage-service.unit.test.ts
│   │
│   ├── access-codes/
│   │   ├── access-code-use-cases.unit.test.ts
│   │   └── module-access-code-service.unit.test.ts
│   │
│   ├── analytics/
│   │   ├── analytics-router.unit.test.ts
│   │   ├── get-inspection-statistics.unit.test.ts
│   │   ├── get-landing-page-stats.unit.test.ts
│   │   ├── landing-page-stats-controller.unit.test.ts
│   │   └── supabase-analytics-repository.unit.test.ts
│   │
│   ├── audit/
│   │   ├── audit-use-cases.unit.test.ts
│   │   └── module-audit-log-service.unit.test.ts
│   │
│   ├── chat/
│   │   ├── list-chat-contacts-controller.unit.test.ts
│   │   ├── module-user-chat-service.unit.test.ts
│   │   └── supabase-chat-contact-repository.unit.test.ts
│   │
│   ├── markets/
│   │   ├── market-location-use-cases.unit.test.ts
│   │   └── module-market-location-service.unit.test.ts
│   │
│   ├── developer/
│   │   ├── dashboard-import-validation.unit.test.ts
│   │   ├── dataset-export.unit.test.ts
│   │   ├── in-app-metrics.unit.test.ts
│   │   ├── module-developer-dashboard-service.unit.test.ts
│   │   ├── module-developer-dashboard-storage-service.unit.test.ts
│   │   ├── module-developer-options-service.unit.test.ts
│   │   └── role-propagation.unit.test.ts
│   │
│   ├── infrastructure/
│   │   ├── chat-contacts-migration.unit.test.ts
│   │   ├── performance-migration.unit.test.ts
│   │   └── supabase-client.unit.test.ts
│   │
│   └── reports/
│       └── report-organization.unit.test.ts
│
├── integration/ # Integration tests (Express routes, auth flows)
│   ├── auth/
│   │   └── cookie-session.integration.test.ts
│   │
│   ├── admin/
│   │   └── status-propagation.integration.test.ts
│   │
│   ├── developer/
│   │   ├── dashboard-auth.integration.test.ts
│   │   └── in-app-overview.integration.test.ts
│   │
│   ├── security/
│   │   ├── error-middleware.integration.test.ts
│   │   └── server-hardening.integration.test.ts
│   │
│   ├── analysis/
│   │   └── .gitkeep
│   │
│   └── inspections/
│       └── .gitkeep
│
├── architecture/ # Architecture tests (boundaries, query shapes, module structure)
│   ├── final-classes.architecture.test.ts
│   ├── import-boundaries.architecture.test.ts
│   ├── legacy-boundary.architecture.test.ts
│   ├── legacy-removal.architecture.test.ts
│   ├── module-exports.architecture.test.ts
│   ├── module-use-case-shape.architecture.test.ts
│   ├── no-legacy-business-logic.architecture.test.ts
│   ├── orphan-model-removal.architecture.test.ts
│   ├── query-shape.architecture.test.ts
│   └── route-registration.architecture.test.ts
│
└── infrastructure/ # Infrastructure tests (contracts, integrations)
    ├── supabase/
    │   └── .gitkeep
    ├── storage/
    │   └── .gitkeep
    ├── email/
    │   └── .gitkeep
    ├── model-runtime/
    │   ├── .gitkeep
    │   └── model-output.contract.test.ts
    └── (other infrastructure tests)
```

## supabase/ - Database & Edge Functions

```
supabase/
├── config.toml # Supabase project configuration
│
├── functions/ # Serverless edge functions
│   └── chat/
│       └── index.ts  # Chat edge function
│
├── migrations/   # Database schema migrations (sequential order)
│   ├── 20260322000000_storage_policies.sql
│   ├── 20260313121403_6ae6f63c-5d00-49d0-8f39-826bae180616.sql
│   ├── 20260313114452_8a069c85-ba36-44a0-a563-9f459050c478.sql
│   ├── 20260313113439_12beb873-661e-4be0-b120-769e29e49af8.sql
│   ├── 20260414000000_add_inspector_code_to_profiles.sql
│   ├── 20260415001000_add_is_dark_mode_to_profiles.sql
│   ├── 20260415002000_add_client_submission_id_to_inspections.sql
│   ├── 20260415003000_add_show_detailed_results_to_profiles.sql
│   ├── 20260502000000_add_not_fresh_classification.sql
│   ├── 20260503001000_add_market_locations.sql
│   ├── 20260508000000_fix_rls_policies.sql
│   ├── 20260508010000_add_audit_logs.sql
│   ├── 20260508121000_add_captured_at_to_inspections.sql
│   ├── 20260508193000_harden_audit_logs_rls.sql
│   ├── 20260517090000_add_user_chat_messages.sql
│   ├── 20260531010000_add_onboarding_fields_to_profiles.sql
│   ├── 20260620010000_add_passkey_credentials.sql
│   ├── 20260624000000_add_passkey_credentials_rls.sql
│   ├── 20260625010000_add_user_sessions.sql
│   ├── 20260628010000_add_report_organization_to_profiles.sql
│   ├── 20260701010000_add_location_coordinates_to_inspections.sql
│   ├── 20260701020000_add_pre_scan_protocol_fields_to_inspections.sql
│   ├── 20260712000000_add_developer_role.sql
│   ├── 20260712000001_update_developer_role_policies.sql
│   ├── 20260713000000_add_manual_classification_to_inspections.sql
│   ├── 20260805160000_add_regulatory_compliance_to_inspections.sql
│   ├── 20260810090000_backend_query_support.sql
│   └── 20260810100000_bounded_chat_contacts.sql
│
└── templates/ # Supabase email templates
    ├── README.md
    ├── confirmation.html
    ├── email_change.html
    ├── invite.html
    ├── magic_link.html
    ├── reauthentication.html
    └── recovery.html
```

## docs/ - Backend Documentation

```
docs/
└── query-inventory.md  # Database queries reference
```

## Configuration & Root Files

```
backend/
├── .env  # Local environment variables (DO NOT COMMIT)
├── .env.example   # Example environment variables
├── .dockerignore # Docker build ignore patterns
├── Dockerfile   # Docker container definition
├── package.json # Node.js dependencies & scripts
├── tsconfig.json # TypeScript configuration
├── README.md   # Backend project documentation
└── planned-architecture.md  # Architecture planning notes
```

## Key Architectural Features

### Module Structure Pattern (DDD)
Each of 10 bounded contexts follows this 4-layer structure:
- **domain/** - Value objects, entities, port interfaces
- **application/** - Use cases (one operation per file)
- **infrastructure/** - Supabase adapters, concrete implementations
- **presentation/** - Express routes, controllers, views

### Shared Layers
- **shared/domain/** - Cross-cutting domain concerns (ApplicationError)
- **shared/application/** - Result type, pagination, request limits
- **shared/infrastructure/** - Supabase client configuration
- **shared/presentation/** - HTTP response builders

### Middleware Stack (src/middleware/)
1. Security headers
2. CORS handling (in app.ts)
3. Auth context resolution
4. CSRF validation for cookie-based requests
5. Rate limiting (public endpoints)
6. File upload constraints
7. Error handling

### Testing Strategy
- **Unit:** Business logic, services, value objects
- **Integration:** Express routes, auth flows, security
- **Architecture:** Boundary enforcement, import validation, query shapes

### Database
- 30+ timestamped migrations
- Supabase PostgreSQL with RLS policies
- No Redis, no message broker
- Aggregate queries for analytics

---

**Generated:** 2026-08-10  
**Framework:** Express.js + TypeScript  
**Database:** Supabase PostgreSQL  
**Architecture Pattern:** Modular Monolith (DDD)
