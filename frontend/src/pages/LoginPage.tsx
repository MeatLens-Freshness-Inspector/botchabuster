import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Fingerprint, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { canUsePasskeys } from "@/lib/passkeys/browser";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyAvailable, setPasskeyAvailable] = useState(false);
  const {
    canUnlockWithLocalPasskey,
    offlineUnlockRequired,
    signIn,
    signInWithPasskey,
    unlockWithLocalPasskey,
  } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const checkPasskeyAvailability = async () => {
      const supported = await canUsePasskeys();
      if (mounted) {
        setPasskeyAvailable(supported);
      }
    };

    void checkPasskeyAvailability();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { isAdmin } = await signIn(email, password);
      navigate(isAdmin ? "/admin" : "/inspect");
    } catch (err: any) {
      toast.error(err.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeySignIn = async () => {
    setPasskeyLoading(true);
    try {
      const { isAdmin } = await signInWithPasskey();
      navigate(isAdmin ? "/admin" : "/inspect");
    } catch (err: any) {
      toast.error(err.message || "Passkey sign in failed");
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handleLocalPasskeyUnlock = async () => {
    setPasskeyLoading(true);
    try {
      const { isAdmin } = await unlockWithLocalPasskey();
      navigate(isAdmin ? "/admin" : "/inspect");
    } catch (err: any) {
      toast.error(err.message || "Passkey unlock failed");
    } finally {
      setPasskeyLoading(false);
    }
  };

  const showOfflinePasskeyUnlock = offlineUnlockRequired && passkeyAvailable && canUnlockWithLocalPasskey;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="font-display text-xl uppercase tracking-wider">Sign In</CardTitle>
          <CardDescription>
            {showOfflinePasskeyUnlock
              ? "Unlock your cached MeatLens session on this device"
              : "Access your MeatLens account"}
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
            <Button type="submit" className="w-full font-display uppercase tracking-wider" disabled={loading}>
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
                {passkeyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
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
                {passkeyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
                Sign In with Passkey
              </Button>
            ) : null}
          </form>
          <div className="mt-4 space-y-2 text-center text-sm">
            <Link to="/forgot-password" className="text-primary hover:underline block">
              Forgot password?
            </Link>
            <p className="text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="text-primary hover:underline">Sign up</Link>
            </p>
            <Link to="/" className="text-muted-foreground hover:text-foreground block text-xs">
              ← Back to home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
