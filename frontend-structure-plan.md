frontend/
├── public/
│
├── src/
│   │
│   ├── app/
│   │   ├── App.tsx
│   │   │
│   │   ├── config/
│   │   │   ├── env.ts
│   │   │   └── query-client.ts
│   │   │
│   │   ├── layouts/
│   │   │   ├── AppLayout.tsx
│   │   │   ├── AdminLayout.tsx
│   │   │   └── PublicLayout.tsx
│   │   │
│   │   ├── providers/
│   │   │   ├── AppProviders.tsx
│   │   │   ├── NetworkProvider.tsx
│   │   │   └── ThemeController.tsx
│   │   │
│   │   └── router/
│   │       ├── AppRouter.tsx
│   │       ├── paths.ts
│   │       └── guards/
│   │           ├── ProtectedRoute.tsx
│   │           ├── AdminRoute.tsx
│   │           └── OnboardingRoute.tsx
│   │
│   ├── features/
│   │   │
│   │   ├── auth/
│   │   │   ├── api/
│   │   │   │   ├── auth.client.ts
│   │   │   │   └── passkey.client.ts
│   │   │   ├── components/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── SignupForm.tsx
│   │   │   │   └── PasswordResetForm.tsx
│   │   │   ├── context/
│   │   │   │   └── AuthContext.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   └── useSession.ts
│   │   │   ├── model/
│   │   │   │   ├── auth.types.ts
│   │   │   │   └── auth.schemas.ts
│   │   │   ├── pages/
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   ├── SignupPage.tsx
│   │   │   │   ├── ForgotPasswordPage.tsx
│   │   │   │   └── ResetPasswordPage.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── inspection/
│   │   │   ├── api/
│   │   │   │   ├── inspection.client.ts
│   │   │   │   ├── inspection.queries.ts
│   │   │   │   └── inspection.keys.ts
│   │   │   ├── components/
│   │   │   │   ├── AnalysisResultCard.tsx
│   │   │   │   ├── FreshnessBadge.tsx
│   │   │   │   ├── InspectionCard.tsx
│   │   │   │   ├── InspectionDetailSheet.tsx
│   │   │   │   └── InspectionList.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useInspection.ts
│   │   │   │   ├── useInspectionHistory.ts
│   │   │   │   └── useCreateInspection.ts
│   │   │   ├── model/
│   │   │   │   ├── inspection.types.ts
│   │   │   │   └── freshness.ts
│   │   │   ├── pages/
│   │   │   │   ├── InspectPage.tsx
│   │   │   │   └── HistoryPage.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── camera/
│   │   │   ├── components/
│   │   │   │   ├── CameraCapture.tsx
│   │   │   │   ├── CameraControls.tsx
│   │   │   │   └── CameraPreview.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useCamera.ts
│   │   │   │   └── useCameraPermissions.ts
│   │   │   ├── services/
│   │   │   │   └── camera.service.ts
│   │   │   ├── model/
│   │   │   │   └── camera.types.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── profile/
│   │   │   ├── api/
│   │   │   │   └── profile.client.ts
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── model/
│   │   │   ├── pages/
│   │   │   │   ├── ProfilePage.tsx
│   │   │   │   ├── ProfileHelpPage.tsx
│   │   │   │   ├── ProfileHelpScopePage.tsx
│   │   │   │   └── ProfileTutorialPage.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── messaging/
│   │   │   ├── api/
│   │   │   │   └── chat.client.ts
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── model/
│   │   │   ├── pages/
│   │   │   │   └── MessagesPage.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── assistant/
│   │   │   ├── components/
│   │   │   │   └── AIChatbot.tsx
│   │   │   ├── hooks/
│   │   │   ├── api/
│   │   │   └── index.ts
│   │   │
│   │   ├── onboarding/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   │   └── OnboardingPage.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── offline/
│   │   │   ├── components/
│   │   │   │   ├── OfflineBanner.tsx
│   │   │   │   ├── OfflineSyncManager.tsx
│   │   │   │   └── NetworkLoadingScreen.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useStartupNetworkCheck.ts
│   │   │   ├── services/
│   │   │   │   └── offline-sync.service.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── admin/
│   │   │   ├── api/
│   │   │   │   ├── access-code.client.ts
│   │   │   │   ├── audit-log.client.ts
│   │   │   │   ├── stats.client.ts
│   │   │   │   └── market-location.client.ts
│   │   │   ├── dashboard/
│   │   │   │   ├── components/
│   │   │   │   ├── hooks/
│   │   │   │   └── AdminDashboard.tsx
│   │   │   ├── audit-logs/
│   │   │   ├── access-codes/
│   │   │   ├── market-locations/
│   │   │   ├── users/
│   │   │   └── index.ts
│   │   │
│   │   └── developer/
│   │       ├── api/
│   │       │   ├── developer-dashboard.client.ts
│   │       │   └── developer-options.client.ts
│   │       ├── components/
│   │       ├── pages/
│   │       └── index.ts
│   │
│   ├── shared/
│   │   ├── api/
│   │   │   ├── api-client.ts
│   │   │   ├── api-error.ts
│   │   │   ├── api-base-url.ts
│   │   │   ├── fetch-with-timeout.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── ui/
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── sonner.tsx
│   │   │   ├── toaster.tsx
│   │   │   ├── tooltip.tsx
│   │   │   └── ...
│   │   │
│   │   ├── components/
│   │   │   ├── BottomNav.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useMediaQuery.ts
│   │   │   └── useMounted.ts
│   │   │
│   │   ├── lib/
│   │   │   ├── cn.ts
│   │   │   ├── date.ts
│   │   │   └── storage.ts
│   │   │
│   │   ├── constants/
│   │   │   └── app.constants.ts
│   │   │
│   │   └── types/
│   │       └── common.types.ts
│   │
│   ├── styles/
│   │   └── globals.css
│   │
│   ├── main.tsx
│   └── vite-env.d.ts
│
├── tests/
│   ├── unit/
│   └── e2e/
│
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts