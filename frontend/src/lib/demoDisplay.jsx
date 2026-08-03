import { BarChart3, Monitor, Smartphone, ShoppingBag, BookOpen, Utensils, Stethoscope, Zap, Lock } from "lucide-react";

// Shared by the Demos page and the homepage demo preview so a demo looks the
// same in both places.
const ICON_MAP = {
  shopping: ShoppingBag,
  monitor: Monitor,
  book: BookOpen,
  food: Utensils,
  health: Stethoscope,
  phone: Smartphone,
  chart: BarChart3,
  zap: Zap,
  lock: Lock,
};

export function getDemoIcon(demo, size = 28) {
  if (demo.icon) return demo.icon;
  const Icon = ICON_MAP[demo.icon_key] || Monitor;
  return <Icon size={size} />;
}

export function statusBadgeClass(status) {
  if (status === "Coming Soon") return "demo-live-badge demo-badge--coming-soon";
  if (status === "Now Building") return "demo-live-badge demo-badge--now-building";
  return "demo-live-badge";
}

// Admin order is preserved exactly — the Demos section has up/down arrows, so
// re-sorting here would silently override a deliberate choice.
export function visibleDemos(demos) {
  return (demos || []).filter((demo) => demo.visible !== false);
}
