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