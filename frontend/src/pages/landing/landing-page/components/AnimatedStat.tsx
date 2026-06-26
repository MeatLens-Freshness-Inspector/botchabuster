import { useCountUp } from "../hooks/useCountUp";

type AnimatedStatProps = {
  label: string;
  rawValue: number;
  suffix?: string;
};

export function AnimatedStat({ rawValue, suffix = "", label }: AnimatedStatProps) {
  const { value, ref } = useCountUp(rawValue);

  return (
    <div ref={ref} className="flex flex-col items-center lg:items-start">
      <div className="font-display text-2xl font-bold text-foreground sm:text-3xl tabular-nums">
        {value.toLocaleString()}
        {suffix}
      </div>
      <div className="mt-1 text-center font-display text-[10px] uppercase tracking-widest text-muted-foreground lg:text-left">
        {label}
      </div>
    </div>
  );
}
