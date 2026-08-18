import { useCountUp } from "../model/use-count-up";

type AnimatedStatProps = {
  label: string;
  rawValue: number;
  suffix?: string;
};

export function AnimatedStat({ rawValue, suffix = "", label }: AnimatedStatProps) {
  const { value, ref } = useCountUp(rawValue);

  return (
    <div ref={ref} className="flex min-w-0 flex-col border-l border-border/70 pl-3 first:border-l-0 first:pl-0">
      <div className="font-display text-2xl font-bold text-foreground sm:text-3xl tabular-nums">
        {value.toLocaleString()}
        {suffix}
      </div>
      <div className="mt-1 text-left font-display text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
