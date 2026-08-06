# Backend Documentation

## Overview
The backend of the MeatLens application is a Node.js/Express server that handles API requests, image processing, and database interactions. It is written in TypeScript and integrates with Supabase for authentication, database, and storage.

### Key Features
- **Express Framework**: RESTful API design.
- **Image Processing**: OpenCV and Sharp for image analysis.
- **Database**: PostgreSQL via Supabase.
- **Authentication**: JWT-based authentication with Supabase.
- **File Storage**: Supabase Storage for image uploads.

## Directory Structure
```
backend/
├── src/
│   ├── controllers/         # API request handlers
│   ├── services/            # Business logic
│   ├── routes/              # Route definitions
│   ├── models/              # Data models
│   ├── middleware/          # Express middleware
│   ├── config/              # Configuration files
│   ├── integrations/        # External service integrations
│   └── server.ts            # Express app setup
├── supabase/                # Database migrations and functions
├── uploads/                 # Local file storage (development)
├── Dockerfile               # Docker configuration for deployment
├── tsconfig.json            # TypeScript configuration
└── package.json             # Project metadata and dependencies
```

## Development
### Prerequisites
- Node.js (v18 or higher)
- npm or your preferred package manager

### Setup
1. Clone the repository.
2. Navigate to the `backend/` directory.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
   The backend will be available at `http://localhost:3000`.

### Build
To compile TypeScript to JavaScript:
```bash
npm run build
```

### Testing
Run tests using the configured test framework:
```bash
npm run test
```

## Deployment
The backend is deployed on Render. The `render.yaml` file in the root directory contains the deployment configuration.

### Environment Variables
Set the following environment variables in Render:
```env
SUPABASE_URL=https://your-supabase-url
SUPABASE_SERVICE_KEY=your-service-key
ALLOWED_ORIGINS=https://your-frontend-url
UPLOAD_DIR=/tmp/uploads
```

## API Docs Route Authority

The Express route modules under `backend/src/routes` remain the authority for the registered `/api` surface. The developer API Docs workspace mirrors those operations in a typed frontend catalog for interactive forms; it does not change route authorization or create an unrestricted proxy.

The current catalog is grouped by route namespace: `auth`, `analysis`, `access-codes`, `inspections`, `profiles`, `stats`, `upload`, `chat`, `market-locations`, `audit-logs`, `developer-options`, `developer-dashboard`, and `user-chat`. Keep the catalog and its route-audit test updated when adding or removing a route.

## Technologies Used
- **Node.js**: JavaScript runtime
- **Express**: Web framework
- **TypeScript**: Static typing
- **Supabase**: Database, authentication, and storage
- **OpenCV**: Image processing
- **Sharp**: Image manipulation

## Additional Resources
- [Express Documentation](https://expressjs.com/)
- [Supabase Documentation](https://supabase.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
