import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-[background-color,box-shadow,transform,color,border-color] duration-200 outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px active:not-aria-[haspopup]:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-[color-mix(in_oklch,var(--primary),black_10%)] bg-[linear-gradient(180deg,var(--primary-top),var(--primary))] text-primary-foreground shadow-elev-primary hover:bg-[linear-gradient(180deg,var(--primary-top-hover),var(--primary))] hover:shadow-elev-primary-hover active:shadow-elev-pressed",
        outline:
          "border-border/80 bg-[linear-gradient(180deg,var(--card-top),var(--card-bottom))] text-foreground shadow-elev-raised hover:border-border hover:shadow-elev-card-hover active:shadow-elev-pressed aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-card dark:hover:bg-input/40",
        secondary:
          "border-secondary/80 bg-secondary text-secondary-foreground shadow-elev-raised hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] hover:shadow-elev-card-hover active:shadow-elev-pressed aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        soft: "border-primary/15 bg-primary/10 text-primary shadow-xs hover:border-primary/25 hover:bg-primary/15 hover:shadow-sm",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive shadow-xs hover:bg-destructive/20 hover:shadow-sm focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        "destructive-solid":
          "border-[color-mix(in_oklch,var(--destructive),black_10%)] bg-[linear-gradient(180deg,color-mix(in_oklch,var(--destructive),white_12%),var(--destructive))] text-destructive-foreground shadow-[inset_0_1px_0_0_oklch(1_0_0/0.2),0_1px_2px_oklch(0.2_0.02_170/0.12),0_6px_16px_color-mix(in_oklch,var(--destructive)_32%,transparent)] hover:bg-[linear-gradient(180deg,color-mix(in_oklch,var(--destructive),white_18%),var(--destructive))] hover:shadow-md active:shadow-elev-pressed",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-11 gap-2 px-6 text-[0.875rem] has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        xs: "h-8 gap-1 px-3 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 px-4 text-xs has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        lg: "h-12 gap-2 px-8 text-base",
        icon: "size-11",
        "icon-xs": "size-8 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
