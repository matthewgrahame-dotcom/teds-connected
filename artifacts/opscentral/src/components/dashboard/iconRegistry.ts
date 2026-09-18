import {
  Aperture,
  BookOpen,
  Calendar,
  FileText,
  FileWarning,
  Globe,
  HelpCircle,
  Instagram,
  Laptop,
  Link as LinkIcon,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Store,
  Users,
  type LucideIcon,
} from 'lucide-react';

// Icons available to pick from when editing Quick Links -- a plain string
// key is stored in the DB (quick_links.icon) rather than a component
// reference, so this registry is what turns that key back into a real
// icon at render time, and what the edit dialog's dropdown offers. Add
// more here as needed; unknown/removed keys fall back to LinkIcon (see
// iconForKey) rather than crashing.
export const ICON_REGISTRY: Record<string, LucideIcon> = {
  Aperture,
  BookOpen,
  Calendar,
  FileText,
  FileWarning,
  Globe,
  HelpCircle,
  Instagram,
  Laptop,
  Link: LinkIcon,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Store,
  Users,
};

export const ICON_KEYS = Object.keys(ICON_REGISTRY);

export function iconForKey(key: string): LucideIcon {
  return ICON_REGISTRY[key] ?? LinkIcon;
}

// The reverse of iconForKey -- used when something OUTSIDE this registry
// (a sidebar nav item, holding a real Lucide component reference rather
// than a string key) needs to become a quick_links row, which only ever
// stores the string key. Falls back to 'Link' (matching iconForKey's own
// fallback for an unrecognized key) for any icon not in this registry --
// the sidebar's own icon set is broader than what's offered in the Quick
// Links edit dialog, so this is expected to miss sometimes, not a bug.
export function keyForIcon(icon: LucideIcon): string {
  const entry = Object.entries(ICON_REGISTRY).find(([, component]) => component === icon);
  return entry?.[0] ?? 'Link';
}
