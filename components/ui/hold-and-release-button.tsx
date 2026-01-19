"use client";

import * as React from "react"
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, useAnimation } from "framer-motion";
import { useState } from "react";

interface ButtonHoldAndReleaseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    holdDuration?: number;
    onHoldComplete?: () => void;
    icon?: React.ReactNode;
    holdingText?: string;
    defaultText?: string;
    variant?: "destructive" | "warning" | "default";
}

function ButtonHoldAndRelease({
    className,
    holdDuration = 2000,
    onHoldComplete,
    icon,
    holdingText = "Release",
    defaultText = "Hold",
    variant = "destructive",
    ...props
}: ButtonHoldAndReleaseProps) {
    const [isHolding, setIsHolding] = useState(false);
    const controls = useAnimation();

    const variantStyles = {
        destructive: {
            base: "bg-red-100 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-950 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900",
            progress: "bg-red-200/50 dark:bg-red-800/50",
        },
        warning: {
            base: "bg-amber-100 dark:bg-amber-950 hover:bg-amber-100 dark:hover:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900",
            progress: "bg-amber-200/50 dark:bg-amber-800/50",
        },
        default: {
            base: "bg-stone-100 dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-900 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800",
            progress: "bg-stone-200/50 dark:bg-stone-700/50",
        },
    };

    const styles = variantStyles[variant];

    async function handleHoldStart() {
        setIsHolding(true);
        controls.set({ width: "0%" });
        await controls.start({
            width: "100%",
            transition: {
                duration: holdDuration / 1000,
                ease: "linear",
            },
        });
        // Hold completed
        onHoldComplete?.();
        setIsHolding(false);
        controls.start({
            width: "0%",
            transition: { duration: 0.1 },
        });
    }

    function handleHoldEnd() {
        if (isHolding) {
            setIsHolding(false);
            controls.stop();
            controls.start({
                width: "0%",
                transition: { duration: 0.1 },
            });
        }
    }

    return (
        <Button
            type="button"
            className={cn(
                "min-w-32 relative overflow-hidden touch-none select-none",
                styles.base,
                className
            )}
            onMouseDown={handleHoldStart}
            onMouseUp={handleHoldEnd}
            onMouseLeave={handleHoldEnd}
            onTouchStart={handleHoldStart}
            onTouchEnd={handleHoldEnd}
            onTouchCancel={handleHoldEnd}
            {...props}
        >
            <motion.div
                initial={{ width: "0%" }}
                animate={controls}
                className={cn("absolute left-0 top-0 h-full", styles.progress)}
            />
            <span className="relative z-10 w-full flex items-center justify-center gap-2">
                {icon}
                {!isHolding ? defaultText : holdingText}
            </span>
        </Button>
    );
}

export { ButtonHoldAndRelease }
