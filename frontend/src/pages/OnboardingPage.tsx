import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const OnboardingPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_42%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))] p-4">
      <Card className="w-full max-w-xl rounded-3xl border border-border/70 bg-card/95 shadow-[0_26px_80px_-36px_rgba(0,0,0,0.7)]">
        <CardHeader className="items-center text-center">
          <CardTitle className="font-display text-2xl uppercase tracking-wider sm:text-3xl">
            Welcome to MeatLens
          </CardTitle>
          <CardDescription className="max-w-md text-sm sm:text-base">
            Your first-time inspector setup will live here.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
};

export default OnboardingPage;
