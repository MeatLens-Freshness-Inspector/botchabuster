# Frontend Documentation

## Overview
The frontend of the MeatLens application is built using modern web technologies to provide a seamless user experience for meat freshness analysis. It is a React-based application with TypeScript, styled using Tailwind CSS, and bundled with Vite.

### Key Features
- **React Components**: Modular and reusable components for UI.
- **State Management**: React Context and custom hooks.
- **API Integration**: Axios-based API clients for backend communication.
- **Testing**: Playwright for end-to-end testing and Vitest for unit testing.
- **Progressive Web App (PWA)**: Offline capabilities with Vite PWA plugin.

## Directory Structure
```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   ├── pages/               # Page-level components
│   ├── contexts/            # React Context for state management
│   ├── hooks/               # Custom React hooks
│   ├── integrations/        # API clients and external integrations
│   ├── types/               # TypeScript type definitions
│   └── App.tsx              # Root component
├── public/                  # Static assets
├── test/                    # Playwright tests
├── Dockerfile               # Docker configuration for deployment
├── vite.config.ts           # Vite configuration
├── tailwind.config.ts       # Tailwind CSS configuration
└── package.json             # Project metadata and dependencies
```

## Development
### Prerequisites
- Node.js (v18 or higher)
- npm or your preferred package manager

### Setup
1. Clone the repository.
2. Navigate to the `frontend/` directory.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:8080`.

### Build
To create a production build:
```bash
npm run build
```

### Testing
Run tests using Playwright:
```bash
npm run test
```

## Deployment
The frontend is deployed on Netlify. The `netlify.toml` file in the root directory contains the deployment configuration.

### Environment Variables
Set the following environment variable in Netlify:
```env
VITE_API_BASE_URL=https://your-backend-url/api
```

## Developer API Docs

Developer accounts have an `API Docs` tab inside the developer settings workspace. It documents every registered `/api` operation in these categories: Authentication, Analysis, Access Codes, Inspections, Profiles, Statistics, Uploads, Chat, Market Locations, Audit Logs, Developer Options, Developer Dashboard, and User Chat.

Select an operation to edit path/query parameters, custom headers, JSON, URL-encoded, or multipart request bodies. `Send` executes against the configured `VITE_API_BASE_URL` using the current app session. Browser requests keep credentialed cookies and the existing CSRF transport; native requests keep the existing Bearer-token transport. Authorization and CSRF headers cannot be entered into the editor or copied into cURL/history.

Responses show status, elapsed time, size, headers, and a formatted body. The last 20 requests are stored locally for replay without automatically sending them. DELETE requests require confirmation before execution.

When a backend route changes, update the typed catalog at `frontend/src/pages/admin-dashboard/components/developer/api-docs/catalog.ts` and keep the category-count route audit test in sync.

## Technologies Used
- **React**: UI library
- **TypeScript**: Static typing
- **Tailwind CSS**: Utility-first CSS framework
- **Vite**: Build tool
- **Playwright**: End-to-end testing
- **Vitest**: Unit testing
- **Supabase**: Backend integration

## Additional Resources
- [React Documentation](https://reactjs.org/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
