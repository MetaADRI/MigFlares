import * as React from "react";
import { cn } from "@/utils/cn";
import { initials } from "@/utils/format";

type AvatarSize = "xs" | "sm" | "md" | "lg";

const sizeClasses: Record<AvatarSize, string> = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
};

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  src?: string | null;
  size?: AvatarSize;
}

/** Avatar with image support and graceful initials fallback. */
function Avatar({ name, src, size = "md", className, ...props }: AvatarProps) {
  const [failed, setFailed] = React.useState(false);
  const showImage = src && !failed;

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white",
        sizeClasses[size],
        "bg-gradient-to-br from-orange-400 to-orange-600 shadow-sm",
        className,
      )}
      {...props}
    >
      {showImage ? (
        <img
          src={src}
          alt={name}
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </div>
  );
}

export { Avatar };
