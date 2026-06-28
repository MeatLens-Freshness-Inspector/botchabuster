import { type FreshnessClassification } from "@/types/inspection";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import type { AdminDashboardPageViewModel } from "../../hooks/useAdminDashboardPage";
import {
  CLASS_COLORS,
  PIE_COLORS,
  UNSPECIFIED_LOCATION_LABEL,
  truncateChartLabel,
} from "../../utils/adminDashboard";

type OverviewTabContentProps = {
  dashboard: AdminDashboardPageViewModel;
};

const OverviewTabContent = ({ dashboard }: OverviewTabContentProps) => {
  const {
    isMobile,
    chartConfig,
    mobileCategoryAxisProps,
    mobileTimeAxisProps,
    dailyInspections,
    pieData,
    classificationCounts,
    inspections,
    stats,
    inspectorAnalytics,
    meatTypeAnalytics,
    locationAnalytics,
    confidenceTrendData,
    freshnessMixData,
  } = dashboard;

  return (
    <>
      <div className="grid min-w-0 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="min-w-0 rounded-3xl border-border/70 bg-card/95">
          <CardHeader>
            <CardTitle className="text-sm font-display uppercase tracking-wider">
              Daily Inspections (14 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[260px] w-full min-w-0">
              <AreaChart data={dailyInspections}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary) / 0.2)"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="min-w-0 rounded-3xl border-border/70 bg-card/95">
          <CardHeader>
            <CardTitle className="text-sm font-display uppercase tracking-wider">
              Classification Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[260px] w-full min-w-0">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={3}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-border/70 bg-card/95">
        <CardHeader>
          <CardTitle className="text-sm font-display uppercase tracking-wider">
            Classification Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(
            ["fresh", "not fresh", "acceptable", "warning", "spoiled"] as FreshnessClassification[]
          ).map((classification) => {
            const count = classificationCounts[classification] || 0;
            const percentage =
              inspections.length > 0 ? (count / inspections.length) * 100 : 0;

            return (
              <div key={classification}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-display text-xs uppercase tracking-wider">
                    {classification}
                  </span>
                  <span className="font-display text-xs text-muted-foreground">
                    {count} ({percentage.toFixed(0)}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full rounded-full transition-all ${CLASS_COLORS[classification]}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {stats?.roles ? (
        <Card className="rounded-3xl border-border/70 bg-card/95">
          <CardHeader>
            <CardTitle className="text-sm font-display uppercase tracking-wider">
              Users by Role
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              {stats.roles.map((roleStat) => (
                <div
                  key={roleStat.role}
                  className="rounded-2xl border border-border/70 bg-background/50 p-3"
                >
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                    {roleStat.role}
                  </p>
                  <p className="mt-1 font-display text-2xl font-semibold">
                    {roleStat.count}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-4">
        <div className="rounded-3xl border border-border/70 bg-card/95 p-4">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Business Analytics
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold tracking-tight">
            Operational trends and risk hotspots
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Compare inspector output, product mix, location risk, and day-by-day
            quality shifts without leaving the overview.
          </p>
        </div>

        <Card className="min-w-0 rounded-3xl border-border/70 bg-card/95">
          <CardHeader>
            <CardTitle className="text-sm font-display uppercase tracking-wider">
              Inspector Performance
            </CardTitle>
            <CardDescription>
              Track who is handling the most inspections and how confidently those
              results are being recorded.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid min-w-0 gap-4 xl:grid-cols-2">
            <div className="min-w-0 rounded-2xl border border-border/70 bg-background/50 p-3 sm:p-4">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Top Inspectors by Inspection Volume
              </p>
              {inspectorAnalytics.length > 0 ? (
                <ChartContainer config={chartConfig} className="mt-4 h-[220px] w-full min-w-0 sm:h-[240px]">
                  <BarChart
                    data={inspectorAnalytics}
                    layout={isMobile ? undefined : "vertical"}
                    margin={
                      isMobile
                        ? { top: 8, right: 4, left: 0, bottom: 8 }
                        : { left: 12, right: 12 }
                    }
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    {isMobile ? (
                      <>
                        <XAxis dataKey="inspector" {...mobileCategoryAxisProps} />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 10 }}
                          width={28}
                          className="fill-muted-foreground"
                        />
                      </>
                    ) : (
                      <>
                        <XAxis
                          type="number"
                          allowDecimals={false}
                          tick={{ fontSize: 11 }}
                          className="fill-muted-foreground"
                        />
                        <YAxis
                          type="category"
                          dataKey="inspector"
                          width={88}
                          tick={{ fontSize: 11 }}
                          tickFormatter={truncateChartLabel}
                          className="fill-muted-foreground"
                        />
                      </>
                    )}
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" radius={[0, 8, 8, 0]} fill="hsl(var(--primary))" />
                  </BarChart>
                </ChartContainer>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  No inspection data yet.
                </p>
              )}
            </div>

            <div className="min-w-0 rounded-2xl border border-border/70 bg-background/50 p-3 sm:p-4">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Average Confidence by Inspector
              </p>
              {inspectorAnalytics.length > 0 ? (
                <ChartContainer config={chartConfig} className="mt-4 h-[220px] w-full min-w-0 sm:h-[240px]">
                  <BarChart
                    data={inspectorAnalytics}
                    layout={isMobile ? undefined : "vertical"}
                    margin={
                      isMobile
                        ? { top: 8, right: 4, left: 0, bottom: 8 }
                        : { left: 12, right: 12 }
                    }
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    {isMobile ? (
                      <>
                        <XAxis dataKey="inspector" {...mobileCategoryAxisProps} />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fontSize: 10 }}
                          width={28}
                          className="fill-muted-foreground"
                        />
                      </>
                    ) : (
                      <>
                        <XAxis
                          type="number"
                          domain={[0, 100]}
                          tick={{ fontSize: 11 }}
                          className="fill-muted-foreground"
                        />
                        <YAxis
                          type="category"
                          dataKey="inspector"
                          width={88}
                          tick={{ fontSize: 11 }}
                          tickFormatter={truncateChartLabel}
                          className="fill-muted-foreground"
                        />
                      </>
                    )}
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="confidence" radius={[0, 8, 8, 0]} fill="hsl(var(--warning))" />
                  </BarChart>
                </ChartContainer>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  No inspection data yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 rounded-3xl border-border/70 bg-card/95">
          <CardHeader>
            <CardTitle className="text-sm font-display uppercase tracking-wider">
              Meat Type Trends
            </CardTitle>
            <CardDescription>
              Separate product throughput from spoilage risk to see which categories
              need more attention.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid min-w-0 gap-4 xl:grid-cols-2">
            <div className="min-w-0 rounded-2xl border border-border/70 bg-background/50 p-3 sm:p-4">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Inspections by Meat Type
              </p>
              {meatTypeAnalytics.length > 0 ? (
                <ChartContainer config={chartConfig} className="mt-4 h-[220px] w-full min-w-0 sm:h-[240px]">
                  <BarChart data={meatTypeAnalytics}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis
                      dataKey="meatType"
                      {...(isMobile
                        ? mobileCategoryAxisProps
                        : {
                            tick: { fontSize: 11 },
                            className: "fill-muted-foreground",
                          })}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="hsl(var(--primary))" />
                  </BarChart>
                </ChartContainer>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  No inspection data yet.
                </p>
              )}
            </div>

            <div className="min-w-0 rounded-2xl border border-border/70 bg-background/50 p-3 sm:p-4">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Spoiled Rate by Meat Type
              </p>
              {meatTypeAnalytics.length > 0 ? (
                <ChartContainer config={chartConfig} className="mt-4 h-[220px] w-full min-w-0 sm:h-[240px]">
                  <BarChart data={meatTypeAnalytics}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis
                      dataKey="meatType"
                      {...(isMobile
                        ? mobileCategoryAxisProps
                        : {
                            tick: { fontSize: 11 },
                            className: "fill-muted-foreground",
                          })}
                    />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="spoiledRate" radius={[8, 8, 0, 0]} fill={PIE_COLORS.spoiled} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  No inspection data yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 rounded-3xl border-border/70 bg-card/95">
          <CardHeader>
            <CardTitle className="text-sm font-display uppercase tracking-wider">
              Location Trends
            </CardTitle>
            <CardDescription>
              Blank inspection and profile locations roll up under{" "}
              {UNSPECIFIED_LOCATION_LABEL} so missing routing data still surfaces in
              the overview.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid min-w-0 gap-4 xl:grid-cols-2">
            <div className="min-w-0 rounded-2xl border border-border/70 bg-background/50 p-3 sm:p-4">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Top Locations by Inspection Count
              </p>
              {locationAnalytics.length > 0 ? (
                <ChartContainer config={chartConfig} className="mt-4 h-[220px] w-full min-w-0 sm:h-[240px]">
                  <BarChart
                    data={locationAnalytics}
                    layout={isMobile ? undefined : "vertical"}
                    margin={
                      isMobile
                        ? { top: 8, right: 4, left: 0, bottom: 8 }
                        : { left: 12, right: 12 }
                    }
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    {isMobile ? (
                      <>
                        <XAxis dataKey="location" {...mobileCategoryAxisProps} />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 10 }}
                          width={28}
                          className="fill-muted-foreground"
                        />
                      </>
                    ) : (
                      <>
                        <XAxis
                          type="number"
                          allowDecimals={false}
                          tick={{ fontSize: 11 }}
                          className="fill-muted-foreground"
                        />
                        <YAxis
                          type="category"
                          dataKey="location"
                          width={88}
                          tick={{ fontSize: 11 }}
                          tickFormatter={truncateChartLabel}
                          className="fill-muted-foreground"
                        />
                      </>
                    )}
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" radius={[0, 8, 8, 0]} fill="hsl(var(--primary))" />
                  </BarChart>
                </ChartContainer>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  No inspection data yet.
                </p>
              )}
            </div>

            <div className="min-w-0 rounded-2xl border border-border/70 bg-background/50 p-3 sm:p-4">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Spoiled Share by Location
              </p>
              {locationAnalytics.length > 0 ? (
                <ChartContainer config={chartConfig} className="mt-4 h-[220px] w-full min-w-0 sm:h-[240px]">
                  <BarChart
                    data={locationAnalytics}
                    layout={isMobile ? undefined : "vertical"}
                    margin={
                      isMobile
                        ? { top: 8, right: 4, left: 0, bottom: 8 }
                        : { left: 12, right: 12 }
                    }
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    {isMobile ? (
                      <>
                        <XAxis dataKey="location" {...mobileCategoryAxisProps} />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fontSize: 10 }}
                          width={28}
                          className="fill-muted-foreground"
                        />
                      </>
                    ) : (
                      <>
                        <XAxis
                          type="number"
                          domain={[0, 100]}
                          tick={{ fontSize: 11 }}
                          className="fill-muted-foreground"
                        />
                        <YAxis
                          type="category"
                          dataKey="location"
                          width={88}
                          tick={{ fontSize: 11 }}
                          tickFormatter={truncateChartLabel}
                          className="fill-muted-foreground"
                        />
                      </>
                    )}
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="spoiledRate" radius={[0, 8, 8, 0]} fill={PIE_COLORS.spoiled} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  No inspection data yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 rounded-3xl border-border/70 bg-card/95">
          <CardHeader>
            <CardTitle className="text-sm font-display uppercase tracking-wider">
              Quality Signals
            </CardTitle>
            <CardDescription>
              Follow day-by-day confidence stability and how the freshness mix shifts
              across the recent inspection window.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid min-w-0 gap-4 xl:grid-cols-2">
            <div className="min-w-0 rounded-2xl border border-border/70 bg-background/50 p-3 sm:p-4">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Average Confidence Trend
              </p>
              <ChartContainer config={chartConfig} className="mt-4 h-[220px] w-full min-w-0 sm:h-[240px]">
                <AreaChart data={confidenceTrendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis
                    dataKey="date"
                    {...(isMobile
                      ? mobileTimeAxisProps
                      : {
                          tick: { fontSize: 11 },
                          className: "fill-muted-foreground",
                        })}
                  />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="confidence"
                    stroke="hsl(var(--warning))"
                    fill="hsl(var(--warning) / 0.18)"
                  />
                </AreaChart>
              </ChartContainer>
            </div>

            <div className="min-w-0 rounded-2xl border border-border/70 bg-background/50 p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Freshness Mix by Day
                </p>
                <div className="flex flex-wrap gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS.fresh }} />
                    Fresh
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS["not fresh"] }} />
                    Not Fresh
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS.acceptable }} />
                    Acceptable
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS.warning }} />
                    Warning
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS.spoiled }} />
                    Spoiled
                  </span>
                </div>
              </div>
              <ChartContainer config={chartConfig} className="mt-4 h-[220px] w-full min-w-0 sm:h-[240px]">
                <BarChart data={freshnessMixData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis
                    dataKey="date"
                    {...(isMobile
                      ? mobileTimeAxisProps
                      : {
                          tick: { fontSize: 11 },
                          className: "fill-muted-foreground",
                        })}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="fresh" stackId="freshness" fill={PIE_COLORS.fresh} />
                  <Bar dataKey="notFresh" stackId="freshness" fill={PIE_COLORS["not fresh"]} />
                  <Bar dataKey="acceptable" stackId="freshness" fill={PIE_COLORS.acceptable} />
                  <Bar dataKey="warning" stackId="freshness" fill={PIE_COLORS.warning} />
                  <Bar
                    dataKey="spoiled"
                    stackId="freshness"
                    fill={PIE_COLORS.spoiled}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
};

export default OverviewTabContent;
