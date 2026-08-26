import type { ComponentProps } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-provider";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface UserAvatarProps extends ComponentProps<typeof Avatar> {
  user?: {
    name?: string | null;
    image?: string | null;
  } | null;
  fallbackClassName?: string;
}

export function UserAvatar({
  user: userProp,
  fallbackClassName,
  className,
  ...props
}: UserAvatarProps) {
  const { user: authUser } = useAuth();
  const u = userProp ?? authUser;
  const name = u?.name || "User";
  const initials = getInitials(name);

  return (
    <Avatar className={className} {...props}>
      <AvatarImage src={u?.image ?? ""} alt={name} />
      <AvatarFallback className={fallbackClassName}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
