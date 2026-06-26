import { Link } from "react-router-dom";
import { Loader2, ShieldCheck } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { TermsAndConditionsDialog } from "@/components/TermsAndConditionsDialog";
import { PrivacyPolicyDialog } from "@/components/PrivacyPolicyDialog";
import { useSignupPage } from "../hooks/useSignupPage";

const SignupPageView = () => {
  const {
    fullName,
    email,
    password,
    accessCode,
    acceptedTerms,
    acceptedPrivacy,
    termsError,
    showTermsDialog,
    showPrivacyDialog,
    loading,
    setFullName,
    setEmail,
    setPassword,
    setAccessCode,
    setShowTermsDialog,
    setShowPrivacyDialog,
    handleSubmit,
    handleAcceptedTermsChange,
    handleAcceptedPrivacyChange,
  } = useSignupPage();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="font-display text-xl uppercase tracking-wider">
            Create Account
          </CardTitle>
          <CardDescription>Create your MeatLens inspector account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="Juan dela Cruz"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
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
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accessCode">Access Code</Label>
              <Input
                id="accessCode"
                placeholder="Enter your organization code"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2 rounded-xl border border-border/70 bg-background/60 p-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="accept-terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => {
                    handleAcceptedTermsChange(Boolean(checked));
                  }}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <Label htmlFor="accept-terms" className="text-xs leading-relaxed">
                    I agree to the MeatLens Terms and Conditions.
                  </Label>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-xs"
                    onClick={() => setShowTermsDialog(true)}
                  >
                    View Terms and Conditions
                  </Button>
                </div>
              </div>
              {termsError ? (
                <p role="alert" className="text-xs font-medium text-destructive">
                  {termsError}
                </p>
              ) : null}
            </div>
            <div className="space-y-2 rounded-xl border border-border/70 bg-background/60 p-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="accept-privacy"
                  checked={acceptedPrivacy}
                  onCheckedChange={(checked) => {
                    handleAcceptedPrivacyChange(Boolean(checked));
                  }}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <Label htmlFor="accept-privacy" className="text-xs leading-relaxed">
                    I have read the MeatLens Privacy Policy.
                  </Label>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-xs"
                    onClick={() => setShowPrivacyDialog(true)}
                  >
                    View Privacy Policy
                  </Button>
                </div>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full font-display uppercase tracking-wider"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <p className="text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
            <Link to="/" className="mt-2 block text-xs text-muted-foreground hover:text-foreground">
              ← Back to home
            </Link>
          </div>
        </CardContent>
      </Card>
      <TermsAndConditionsDialog open={showTermsDialog} onOpenChange={setShowTermsDialog} />
      <PrivacyPolicyDialog open={showPrivacyDialog} onOpenChange={setShowPrivacyDialog} />
    </div>
  );
};

export default SignupPageView;
