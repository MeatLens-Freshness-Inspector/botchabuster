import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/shared/ui/chart";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import type { AdminDashboardPageViewModel } from "../../model/use-admin-dashboard";
import {
  PIE_COLORS,
  UNSPECIFIED_LOCATION_LABEL,
  truncateChartLabel,
} from "../../lib/dashboard";
import { SummaryCards } from "./summary-cards";

type OverviewTabContentProps = {
  dashboard: AdminDashboardPageViewModel;
};

const InspectionChart = ({ dashboard }: OverviewTabContentProps) => {
  const {
    isMobile,
    chartConfig,
    mobileCategoryAxisProps,
    mobileTimeAxisProps,
    inspectorAnalytics,
    meatTypeAnalytics,
    locationAnalytics,
    confidenceTrendData,
    freshnessMixData,
  } = dashboard;

  return (
    <>
      <SummaryCards dashboard={dashboard} />

      <section className="space-y-4">
        <div className="rounded-[32px] border border-border/70 bg-card/95 p-5 shadow-[0_24px_70px_-44px_rgba(0,0,0,0.45)]">
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            Business analytics
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
            Inspector, product, and location signals
          </h2>
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
            Compare inspector output, product mix, location risk, and day-by-day
            quality shifts without leaving the overview.
          </p>
        </div>

        <Card className="min-w-0 rounded-[32px] border-border/70 bg-card/95 shadow-[0_24px_70px_-44px_rgba(0,0,0,0.45)]">
          <CardHeader className="space-y-2">
            <CardTitle className="text-base font-semibold tracking-tight">
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

        <Card className="min-w-0 rounded-[32px] border-border/70 bg-card/95 shadow-[0_24px_70px_-44px_rgba(0,0,0,0.45)]">
          <CardHeader className="space-y-2">
            <CardTitle className="text-base font-semibold tracking-tight">
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

        <Card className="min-w-0 rounded-[32px] border-border/70 bg-card/95 shadow-[0_24px_70px_-44px_rgba(0,0,0,0.45)]">
          <CardHeader className="space-y-2">
            <CardTitle className="text-base font-semibold tracking-tight">
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

        <Card className="min-w-0 rounded-[32px] border-border/70 bg-card/95 shadow-[0_24px_70px_-44px_rgba(0,0,0,0.45)]">
          <CardHeader className="space-y-2">
            <CardTitle className="text-base font-semibold tracking-tight">
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

export default InspectionChart;
