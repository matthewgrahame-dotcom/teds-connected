import {
  Aperture,
  Briefcase,
  BookOpen,
  Calendar,
  FileText,
  FileWarning,
  GraduationCap,
  Globe,
  HelpCircle,
  IdCard,
  Instagram,
  Laptop,
  LayoutGrid,
  Link as LinkIcon,
  Mail,
  MapPin,
  Newspaper,
  Phone,
  ShieldCheck,
  Store,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';

// Icons available to pick from when editing Quick Links -- a plain string
// key is stored in the DB (quick_links.icon) rather than a component
// reference, so this registry is what turns that key back into a real
// icon at render time, and what the edit dialog's dropdown offers. Add
// more here as needed; unknown/removed keys fall back to LinkIcon (see
// iconForKey) rather than crashing.
//
// Also the registry nav_items relies on for the exact same reason --
// Briefcase/GraduationCap/IdCard/LayoutGrid/Newspaper/UsersRound were
// added specifically because the sidebar's own nav items use them, and
// the nav<->dashboard drag-move feature needs every nav icon to survive
// becoming a quick_links row (and back) without silently downgrading to
// the generic link icon.
export const ICON_REGISTRY: Record<string, LucideIcon> = {
  Aperture,
  Briefcase,
  BookOpen,
  Calendar,
  FileText,
  FileWarning,
  GraduationCap,
  Globe,
  HelpCircle,
  IdCard,
  Instagram,
  Laptop,
  LayoutGrid,
  Link: LinkIcon,
  Mail,
  MapPin,
  Newspaper,
  Phone,
  ShieldCheck,
  Store,
  Users,
  UsersRound,
};

export const ICON_KEYS = Object.keys(ICON_REGISTRY);

export function iconForKey(key: string): LucideIcon {
  return ICON_REGISTRY[key] ?? LinkIcon;
}

