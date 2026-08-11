import { useEffect, useState } from "react";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const [theme, setTheme] = useState<ToasterProps["theme"]>("light");

  useEffect(() => {
    const root = document.documentElement;
    const applyToasterTheme = () => {
      const isDark = root.dataset.theme === "dark";
      setTheme(isDark ? "dark" : "light");
    };

    applyToasterTheme();

    const observer = new MutationObserver(applyToasterTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });

    return () => observer.disconnect();
  }, []);

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
