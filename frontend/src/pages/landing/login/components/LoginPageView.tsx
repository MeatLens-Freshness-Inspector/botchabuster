import { Link } from "react-router-dom";
import { Fingerprint, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useLoginPage } from "../hooks/useLoginPage";
import { getLoginDescription } from "../utils/loginPage";

const LoginPageView = () => {
  const {
    email,
    password,
    loading,
    passkeyLoading,
    passkeyAvailable,
    setEmail,
    setPassword,
    handleSubmit,
    handlePasskeySignIn,
    handleLocalPasskeyUnlock,
    showOfflinePasskeyUnlock,
  } = useLoginPage();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="font-display text-xl uppercase tracking-wider">
            Sign In
          </CardTitle>
          <CardDescription>
            {getLoginDescription(showOfflinePasskeyUnlock)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="inspector@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full font-display uppercase tracking-wider"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
            </Button>
            {showOfflinePasskeyUnlock ? (
              <Button
                type="button"
                variant="outline"
                className="w-full font-display uppercase tracking-wider"
                disabled={passkeyLoading}
                onClick={handleLocalPasskeyUnlock}
              >
                {passkeyLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Fingerprint className="h-4 w-4" />
                )}
                Unlock with Passkey
              </Button>
            ) : passkeyAvailable ? (
              <Button
                type="button"
                variant="outline"
                className="w-full font-display uppercase tracking-wider"
                disabled={passkeyLoading}
                onClick={handlePasskeySignIn}
              >
                {passkeyLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Fingerprint className="h-4 w-4" />
                )}
                Sign In with Passkey
              </Button>
            ) : null}
          </form>
          <div className="mt-4 space-y-2 text-center text-sm">
            <Link to="/forgot-password" className="block text-primary hover:underline">
              Forgot password?
            </Link>
            <p className="text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
            <Link to="/" className="block text-xs text-muted-foreground hover:text-foreground">
              ← Back to home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPageView;
