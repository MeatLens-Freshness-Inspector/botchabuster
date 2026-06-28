import { format } from "date-fns";
import { Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminDashboardPageViewModel } from "../../hooks/useAdminDashboardPage";

type AccessCodesTabContentProps = {
  dashboard: AdminDashboardPageViewModel;
};

const AccessCodesTabContent = ({ dashboard }: AccessCodesTabContentProps) => {
  const {
    accessCodes,
    newCode,
    newCodeDesc,
    setNewCode,
    setNewCodeDesc,
    handleCreateCode,
    handleToggleCode,
    handleDeleteCode,
  } = dashboard;

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <Card className="min-w-0 rounded-3xl border-border/70 bg-card/95">
        <CardHeader>
          <CardTitle className="text-sm font-display uppercase tracking-wider">
            Create Access Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Code
            </Label>
            <Input
              placeholder="e.g. INSPECTOR-2026"
              value={newCode}
              onChange={(event) => setNewCode(event.target.value)}
              className="h-10 rounded-xl font-display tracking-wider"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Description
            </Label>
            <Input
              placeholder="Batch for Region V"
              value={newCodeDesc}
              onChange={(event) => setNewCodeDesc(event.target.value)}
              className="h-10 rounded-xl"
            />
          </div>
          <Button
            size="sm"
            onClick={handleCreateCode}
            className="h-10 rounded-xl gap-1"
          >
            <Plus className="h-4 w-4" />
            Generate
          </Button>
        </CardContent>
      </Card>

      <Card className="min-w-0 rounded-3xl border-border/70 bg-card/95">
        <CardHeader>
          <CardTitle className="text-sm font-display uppercase tracking-wider">
            Manage Access Codes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {accessCodes.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No access codes yet
            </p>
          ) : (
            <div className="space-y-3">
              {accessCodes.map((code) => (
                <div
                  key={code.id}
                  className="rounded-2xl border border-border/70 bg-background/50 p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="font-display text-sm font-semibold tracking-wider">
                          {code.code}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                            code.is_active
                              ? "bg-fresh/20 text-fresh"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {code.is_active ? "Active" : "Disabled"}
                        </span>
                      </div>
                      {code.description ? (
                        <p className="text-xs text-muted-foreground">
                          {code.description}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        Used {code.times_used}x - Created{" "}
                        {format(new Date(code.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(code.code);
                            toast.success("Code copied");
                          } catch {
                            toast.error("Failed to copy code");
                          }
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-xs font-display"
                        onClick={() =>
                          void handleToggleCode(code.id, !code.is_active)
                        }
                      >
                        {code.is_active ? "OFF" : "ON"}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                        onClick={() => void handleDeleteCode(code.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessCodesTabContent;
