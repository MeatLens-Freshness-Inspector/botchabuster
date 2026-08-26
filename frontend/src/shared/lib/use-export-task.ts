import { useCallback, useRef, useState } from "react";

export function useExportTask<Task extends string>() {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const activeTaskRef = useRef<Task | null>(null);

  const run = useCallback(async (task: Task, operation: () => void | Promise<void>): Promise<boolean> => {
    if (activeTaskRef.current) return false;

    activeTaskRef.current = task;
    setActiveTask(task);

    try {
      await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 0));
      await operation();
      return true;
    } finally {
      activeTaskRef.current = null;
      setActiveTask(null);
    }
  }, []);

  return { activeTask, run };
}
