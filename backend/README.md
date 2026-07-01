# MeatLens Backend

Node.js/Express backend for MeatLens authentication, inspection, storage, and admin APIs.

## Setup

```bash
cd backend
npm install
npm run dev
```

## Environment Variables

```env
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
APP_SESSION_SECRET=your_long_random_app_session_secret
```

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
