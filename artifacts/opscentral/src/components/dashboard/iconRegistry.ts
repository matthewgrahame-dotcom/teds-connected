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
