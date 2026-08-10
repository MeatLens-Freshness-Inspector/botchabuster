example that I want to use.

backend/
├── src/
│   ├── app.ts
│   ├── server.ts
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   │   └── Session.ts
│   │   │   │   ├── errors/
│   │   │   │   └── ports/
│   │   │   │       ├── SessionRepository.ts
│   │   │   │       └── PasskeyRepository.ts
│   │   │   │
│   │   │   ├── application/
│   │   │   │   ├── use-cases//
│   │   │   │   │   ├── LoginUser.ts
│   │   │   │   │   ├── LogoutUser.ts
│   │   │   │   │   ├── RefreshSession.ts
│   │   │   │   │   ├── RegisterPasskey.ts
│   │   │   │   │   └── EnforceSessionLimit.ts
│   │   │   │   └── dto/
│   │   │   │
│   │   │   ├── infrastructure/
│   │   │   │   ├── repositories/
│   │   │   │   │   └── SupabaseSessionRepository.ts
│   │   │   │   ├── passkeys/
│   │   │   │   └── persistence/
│   │   │   │
│   │   │   ├── presentation/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.routes.ts
│   │   │   │   └── auth.schema.ts
│   │   │   │
│   │   │   └── index.ts
│   │   │
│   │   ├── inspections/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── infrastructure/
│   │   │   ├── presentation/
│   │   │   └── index.ts
│   │   │
│   │   ├── analysis/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── infrastructure/
│   │   │   │   ├── inference/
│   │   │   │   ├── image-processing/
│   │   │   │   └── storage/
│   │   │   ├── presentation/
│   │   │   └── index.ts
│   │   │
│   │   ├── users/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── infrastructure/
│   │   │   ├── presentation/
│   │   │   └── index.ts
│   │   │
│   │   ├── access-codes/
│   │   ├── audit/
│   │   ├── markets/
│   │   ├── chat/
│   │   ├── analytics/
│   │   └── developer/
│   │
│   ├── shared/
│   │   ├── domain/
│   │   │   ├── errors/
│   │   │   ├── types/
│   │   │   └── value-objects/
│   │   │
│   │   ├── application/
│   │   │   ├── Result.ts
│   │   │   └── pagination.ts
│   │   │
│   │   ├── infrastructure/
│   │   │   ├── database/
│   │   │   │   ├── supabase.ts
│   │   │   │   └── transaction.ts
│   │   │   ├── storage/
│   │   │   ├── cache/
│   │   │   ├── logging/
│   │   │   └── crypto/
│   │   │
│   │   └── presentation/
│   │       ├── middleware/
│   │       │   ├── auth.middleware.ts
│   │       │   ├── csrf.middleware.ts
│   │       │   ├── rate-limit.middleware.ts
│   │       │   ├── security-headers.middleware.ts
│   │       │   └── error-handler.middleware.ts
│   │       └── http/
│   │           └── response.ts
│   │
│   ├── config/
│   │   ├── env.ts
│   │   ├── app.config.ts
│   │   └── index.ts
│   │
│   └── bootstrap/
│       ├── modules.ts
│       ├── dependencies.ts
│       └── routes.ts
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── architecture/
│   └── fixtures/
│
├── supabase/ (this is immutable sadly)
│   ├── functions/chat
│   ├── migrations
│   └── templates
│
├── package.json
└── tsconfig.json