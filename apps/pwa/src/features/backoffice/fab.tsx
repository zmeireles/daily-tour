import { Link } from "react-router";
import { motion, useReducedMotion } from "motion/react";
import { Plus, type LucideIcon } from "lucide-react";

// Mobile floating action button for a list page's primary create action (<md).
// A single-shot enter (fade + scale-up) plus small press/hover feedback — tied to
// mount and to user touch, never continuous. Instant and static under
// prefers-reduced-motion. The motion lives on a wrapper so the routed <Link>
// stays a plain anchor (simpler, and no motion(Component) factory).
export function Fab({
  to,
  label,
  icon: Icon = Plus,
}: {
  to: string;
  label: string;
  icon?: LucideIcon;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className="fixed right-4 bottom-20 z-30 md:hidden"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      initial={reduce ? false : { opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reduce ? 0 : 0.2, ease: [0.22, 0.61, 0.36, 1] }}
      whileHover={reduce ? undefined : { scale: 1.05 }}
      whileTap={reduce ? undefined : { scale: 0.92 }}
    >
      <Link
        to={to}
        aria-label={label}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
      >
        <Icon className="h-6 w-6" aria-hidden="true" />
      </Link>
    </motion.div>
  );
}
