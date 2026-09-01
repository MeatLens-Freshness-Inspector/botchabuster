import { useCountUp } from "../model/use-count-up";

type AnimatedStatProps = {
  label: string;
  rawValue: number;
  suffix?: string;
};

export function AnimatedStat({ rawValue, suffix = "", label }: AnimatedStatProps) {
  const { value, ref } = useCountUp(rawValue);

  return (
    <div ref={ref} className="flex flex-col items-start">
      <div className="text-2xl font-semibold tracking-[-0.04em] text-[#15231b] sm:text-3xl tabular-nums">
        {value.toLocaleString()}
        {suffix}
      </div>
      <div className="mt-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5d6d63]">
        {label}
      </div>
    </div>
  );
}
