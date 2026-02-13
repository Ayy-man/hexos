import * as React from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SignalType = "good" | "warn" | "bad" | "accent" | "ghost";

// ---------------------------------------------------------------------------
// Status → Signal mapping (single source of truth)
// ---------------------------------------------------------------------------

const STATUS_SIGNAL_MAP: Record<string, SignalType> = {
  // accent — active forward-moving statuses
  deliverables_pending: "accent",
  agreement_sent: "accent",
  onboarding_started: "accent",
  requirements_gathering: "accent",
  development_ready: "accent",
  in_development: "accent",
  internal_review: "accent",
  final_review: "accent",
  delivery_prep: "accent",
  in_queue: "accent",
  admin_reviewed: "accent",
  ai_matching: "accent",
  qualified: "accent",
  proposal_drafting: "accent",
  proposal_sent: "accent",
  accepted: "accent",
  new: "accent",

  // good — milestones achieved
  agreement_signed: "good",
  payment_received: "good",
  requirements_complete: "good",
  delivered: "good",
  completed: "good",
  done: "good",
  on_track: "good",
  healthy: "good",
  ready: "good",

  // warn — waiting on external action / needs attention
  payment_pending: "warn",
  client_review: "warn",
  revision: "warn",
  sign_off_pending: "warn",
  on_hold: "warn",
  pending: "warn",
  at_risk: "warn",
  in_progress: "warn",
  working: "warn",
  reviewed: "warn",
  reopened: "warn",

  // bad — blocked / failed
  blocked_client: "bad",
  blocked_internal: "bad",
  blocked: "bad",
  behind: "bad",
  overdue: "bad",
  failed: "bad",
  lost: "bad",

  // ghost — inactive / archived
  cancelled: "ghost",
  archived: "ghost",
  inactive: "ghost",
  closed: "ghost",
};

// ---------------------------------------------------------------------------
// Signal → Tailwind classes
// ---------------------------------------------------------------------------

interface SignalClasses {
  dot: string;
  text: string;
  dim: string;
  border: string;
}

const SIGNAL_CLASSES: Record<SignalType, SignalClasses> = {
  good: {
    dot: "bg-signal-good",
    text: "text-signal-good",
    dim: "bg-signal-good-dim",
    border: "border-signal-good",
  },
  warn: {
    dot: "bg-signal-warn",
    text: "text-signal-warn",
    dim: "bg-signal-warn-dim",
    border: "border-signal-warn",
  },
  bad: {
    dot: "bg-signal-bad",
    text: "text-signal-bad",
    dim: "bg-signal-bad-dim",
    border: "border-signal-bad",
  },
  accent: {
    dot: "bg-accent",
    text: "text-accent",
    dim: "bg-accent-dim",
    border: "border-accent",
  },
  ghost: {
    dot: "bg-text-ghost",
    text: "text-text-ghost",
    dim: "bg-bg-hover",
    border: "border-text-ghost",
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Map any status string to its signal type.
 * Unknown statuses default to 'accent'.
 */
export function getStatusSignal(status: string): SignalType {
  return STATUS_SIGNAL_MAP[status] ?? "accent";
}

/**
 * Return Tailwind class strings for a given signal type.
 */
export function getSignalClasses(signal: SignalType): SignalClasses {
  return SIGNAL_CLASSES[signal];
}

/**
 * Convert a snake_case status string to Title Case.
 * e.g. 'in_progress' → 'In Progress', 'blocked_client' → 'Blocked Client'
 */
export function getStatusLabel(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * 7px signal dot rendered as a span.
 */
export const StatusDot: React.FC<{
  status: string;
  className?: string;
}> = ({ status, className }) => {
  const signal = getStatusSignal(status);
  const classes = getSignalClasses(signal);

  return React.createElement("span", {
    className: `w-[7px] h-[7px] rounded-full inline-block ${classes.dot}${className ? ` ${className}` : ""}`,
  });
};

/**
 * Convenience helper — returns signal, classes, and label for a status in one call.
 */
export function getStatusConfig(status: string) {
  const signal = getStatusSignal(status);
  const classes = getSignalClasses(signal);
  const label = getStatusLabel(status);
  return { signal, classes, label };
}
