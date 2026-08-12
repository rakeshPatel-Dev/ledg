import { cn } from "@/lib/utils";

interface AppLogoProps {
  className?: string;
  imgClassName?: string;
}

const AppLogo = ({ className, imgClassName }: AppLogoProps) => {
  return (
    <span
      className={cn(
        "flex size-16 items-center justify-center rounded-4xl bg-primary text-primary-foreground shadow-lg shadow-primary/30",
        className
      )}
    >
      <img
        loading="lazy"
        alt="Ledg logo"
        src="/ledg-logo.svg"
        className={cn("size-10", imgClassName)}
      />
    </span>
  );
};

export default AppLogo;
