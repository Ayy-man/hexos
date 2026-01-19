"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface BlockLoaderProps {
  /** Tailwind bg color class (e.g., "bg-primary", "bg-blue-600") */
  blockColor?: string;
  /** Tailwind border color class (e.g., "border-primary", "border-blue-600") */
  borderColor?: string;
  /** Block width/height in pixels */
  size?: number;
  /** Gap between blocks in pixels */
  gap?: number;
  /** Animation duration in seconds */
  speed?: number;
  className?: string;
}

/**
 * Animated block loader with morphing flex blocks
 *
 * @example
 * <BlockLoader />
 *
 * @example
 * <BlockLoader
 *   blockColor="bg-primary"
 *   borderColor="border-primary"
 *   size={60}
 *   speed={1.2}
 * />
 */
const BlockLoader: React.FC<BlockLoaderProps> = ({
  blockColor = "bg-primary",
  borderColor = "border-primary",
  size = 75,
  gap = 4,
  speed = 1,
  className,
}) => {
  const blocks = [0, 1, 2, 3];
  const containerWidth = size * 2 + gap * 3;

  return (
    <div
      className={cn(
        "flex flex-wrap p-1 border-2 rounded-md justify-center",
        borderColor,
        className
      )}
      style={{
        maxWidth: `${containerWidth}px`,
        gap: `${gap}px`,
      }}
    >
      {blocks.map((_, i) => (
        <div
          key={i}
          className={cn(blockColor, "rounded-sm")}
          style={{
            width: `${size}px`,
            height: `${size}px`,
            flex: 1, // Initial state to prevent jump
            animation: `blockLoading ${speed}s ease-in-out infinite`,
            animationDelay: `${-speed + i * (speed / 4)}s`, // Negative delay starts mid-animation
          }}
        />
      ))}

      <style>{`
        @keyframes blockLoading {
          0%, 100% { flex: 1; }
          50% { flex: 3; }
        }
      `}</style>
    </div>
  );
};

/**
 * Centered block loader for full-page or container loading states
 */
export function BlockLoaderCentered({ className, ...props }: BlockLoaderProps) {
  return (
    <div className={cn("flex items-center justify-center h-full min-h-[200px]", className)}>
      <BlockLoader {...props} />
    </div>
  );
}

export default BlockLoader;
export { BlockLoader };
