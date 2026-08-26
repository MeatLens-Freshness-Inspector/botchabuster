import { useCallback, useRef, useState } from "react";

export interface ExportProgress {
  current: number;
  total: number;
}

export type ExportProgressReporter = (progress: ExportProgress) => void;

export function useExportTask<Task extends string>() {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const activeTaskRef = useRef<Task | null>(null);

  const run = useCallback(async (
    task: Task,
    operation: (report: ExportProgressReporter) => void | Promise<void>,
  ): Promise<boolean> => {
    if (activeTaskRef.current) return false;

    activeTaskRef.current = task;
    setActiveTask(task);
    setProgress(null);

    const report: ExportProgressReporter = (nextProgress) => {
      const total = Math.max(1, Math.trunc(nextProgress.total));
      const current = Math.min(Math.max(0, Math.trunc(nextProgress.current)), total);
      setProgress({ current, total });
    };

    try {
      await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 0));
      await operation(report);
      return true;
    } finally {
      activeTaskRef.current = null;
      setActiveTask(null);
      setProgress(null);
    }
  }, []);

  return { activeTask, progress, run };
}
