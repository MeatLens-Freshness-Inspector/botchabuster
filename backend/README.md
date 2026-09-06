# MeatLens Backend

Node.js/Express backend for MeatLens authentication, inspection, storage, and admin APIs.

## Setup

```bash
cd backend
npm install
npm run dev
```

## Testing

```bash
# Run the full backend suite
npm test

# Run isolated service, config, type, and utility tests
npm run test:unit

# Run Express and HTTP behavior tests
npm run test:integration
```

## Environment Variables

```env
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
APP_SESSION_SECRET=your_long_random_app_session_secret
TRANSPORT_KEY_ID=v1
TRANSPORT_RSA_PRIVATE_KEY=your_backend_only_rsa_private_key_with_escaped_newlines
```

`TRANSPORT_RSA_PRIVATE_KEY` is backend-only. The frontend bootstraps the
corresponding public key and creates a fresh AES-256-GCM request key for each
application request; no reusable symmetric transport key belongs in frontend
environment files.

## Architecture

```
backend/
├── src/
│   ├── server.ts              # Express entry point
│   ├── config/
│   │   └── index.ts           # Configuration management
│   ├── controllers/
│   │   └── AnalysisController.ts
│   ├── services/
│   │   ├── StorageService.ts           # Supabase image storage
│   │   ├── InspectionService.ts        # Inspection record operations
│   │   ├── ProfileService.ts           # Profile management
│   │   ├── AccessCodeService.ts        # Registration code management
│   │   └── StatsService.ts             # Admin dashboard aggregates
│   ├── models/
│   │   └── InspectionResult.ts
│   ├── middleware/
│   │   └── upload.ts          # Multer file upload
│   └── routes/
│       └── analysis.ts
├── package.json
└── tsconfig.json
```

## API Endpoints

- `POST /api/analyze` - Analyze meat image (multipart form: image + meat_type)
- `GET /api/health` - Health check
