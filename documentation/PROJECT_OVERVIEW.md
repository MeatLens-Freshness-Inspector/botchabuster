# MeatLens - Project Overview

Maintainer: Annah Claire B. Dimate

## About MeatLens

**MeatLens** is an AI-powered meat freshness inspection system designed for wet markets. It combines computer vision and machine learning to analyze meat quality using:

- **CNN Classification** - MobileNetV3 image inference for freshness decision support
- **Confidence-Based Decision Support** - Probability-aware guidance for inspectors
- **Field Workflow Integration** - Capture, analyze, save, and sync inspection records
- **Reporting & Analytics** - Admin insights with location-aware inspection trends

## Project Goals

1. **Accurate Freshness Detection** - Provide reliable assessments of meat quality
2. **Market Integration** - Streamline inspection workflows for wet market vendors
3. **Data Transparency** - Track and aggregate freshness metrics over time
4. **User-Friendly Interface** - Simple, intuitive UI for inspectors in the field

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Build Tool**: Vite
- **Testing**: Vitest + Playwright
- **State Management**: React Context + Custom Hooks
- **Backend Communication**: Axios-based API clients

### Backend
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Language**: TypeScript
- **Image Processing**: Sharp (image manipulation), OpenCV (analysis)
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage

### Infrastructure
- **Database & Auth**: Supabase (PostgreSQL + Auth service)
- **File Storage**: Supabase Storage (S3-compatible)
- **Real-time**: Supabase Realtime (optional)

## Project Structure

```
botchabuster/
├── frontend/                # React UI application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page routes
│   │   ├── integrations/    # API clients & Supabase
│   │   ├── contexts/        # React contexts
│   │   ├── hooks/           # Custom React hooks
│   │   └── types/           # TypeScript types
│   └── package.json
├── backend/                 # Express API server
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── services/        # Business logic
│   │   ├── routes/          # Route definitions
│   │   ├── models/          # Data models
│   │   ├── middleware/      # Express middleware
│   │   ├── config/          # Configuration
│   │   └── integrations/    # External integrations
│   ├── supabase/            # DB migrations & functions
│   ├── uploads/             # Local file storage (dev)
│   └── package.json
├── documentation/           # Project documentation
└── package.json             # Monorepo workspace config
```

## Key Features

### For Inspectors
- Capture meat images using device camera
- Get instant freshness analysis
- Access inspection history
- Use shared access codes for team collaboration

### For Administrators
- View all inspections across users
- Manage access codes and team members
- Access dashboard with aggregate statistics
- Export inspection data

### System Features
- **Role-Based Access Control** - Inspector vs Admin roles
- **Access Codes** - Share inspection capabilities with team members
- **Image Storage** - Secure per-user image storage with RLS
- **Real-time Analytics** - Dashboard stats and visualization
- **API-First Architecture** - Backend serves frontend and potential 3rd-party integrations

## Development Workflow

### Local Setup
```bash
# Install dependencies
npm install

# Start development services
npm run dev:frontend   # React dev server (port 8080)
npm run dev:backend    # Express server (port 3000)
```

### Key Scripts
- `npm run dev` - Start both frontend and backend
- `npm run build` - Build both applications
- `npm run test` - Run tests
- `npm run lint` - Check code quality

## Core Services

### Backend Services
- **AuthService** - Authentication and authorization
- **ProfileService** - Inspector profile management
- **InspectionService** - Inspection record CRUD
- **AccessCodeService** - Registration access code management
- **MarketLocationService** - Market location options management
- **StorageService** - Inspection image upload and storage
- **StatsService** - Dashboard statistics and rollups
- **AuditLogService** - Encrypted audit event logging
- **DeveloperOptionsService** - Developer option validation
- **UserChatService** - Messaging persistence

### Frontend Integrations
- **ProfileClient** - Profile API calls
- **InspectionClient** - Inspection API calls
- **AccessCodeClient** - Access code management API
- **StatsClient** - Statistics & analytics API
- **UploadClient** - Image upload handling

## Database Components

### Core Tables
- `profiles` - User profile information with roles
- `inspections` - Inspection records (images, results, metadata)
- `access_codes` - Access code management for team sharing
- `activity_log` - Audit trail and activity tracking

### Security
- **Row-Level Security (RLS)** - Database-enforced access control
- **Storage Policies** - Bucket-based file access control
- **Authentication** - Supabase JWT-based auth

## API Architecture

### REST Endpoints (8 route groups)
- `/api/profiles` - User profiles and roles
- `/api/inspections` - Inspection records
- `/api/access-codes` - Access code management
- `/api/stats` - Analytics and statistics
- `/api/analysis` - Image analysis operations
- `/api/upload` - File uploads
- `/api/auth` - Authentication flows
- `/api/chat` - AI chat integration

All endpoints require authentication (JWT token) except specifically documented public endpoints.

## Development Phases

### Phase 1: MVP (✅ Complete)
- User authentication and profiles
- Basic image capture and upload
- Freshness analysis (color & texture)
- Inspection history

### Phase 2: Team Features (✅ Complete)
- Access codes for team sharing
- Role-based admin dashboard
- Multi-user support

### Phase 3: Analytics (✅ In Progress)
- Statistical dashboards
- Trend analysis
- Export capabilities

### Phase 4: Integration
- Planned: Mobile app
- Planned: Third-party integrations
- Planned: Advanced ML models

## Next Steps

See [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) for detailed setup and development instructions.

See [DEPLOY.md](DEPLOY.md) for production deployment guidelines.
