import {
  Award,
  BookOpen,
  Briefcase,
  Building2,
  ChartColumn,
  FlaskConical,
  FolderKanban,
  FolderOpen,
  FolderTree,
  Globe,
  GraduationCap,
  Hash,
  Image,
  Inbox,
  LayoutDashboard,
  Layers,
  Link2,
  Menu,
  MonitorSmartphone,
  PenLine,
  Plug,
  Presentation,
  ScrollText,
  Server,
  Settings,
  Shield,
  Tags,
  Target,
  UserRound,
  Users,
  Workflow,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { PERMISSIONS, type Permission } from "@portfolio/shared";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: Permission;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

const content = PERMISSIONS.CONTENT_READ;

/** The admin sidebar, grouped by task. Items the user cannot access are hidden. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, permission: content },
      {
        href: "/admin/messages",
        label: "Messages",
        icon: Inbox,
        permission: PERMISSIONS.MESSAGES_MANAGE,
      },
      {
        href: "/admin/analytics",
        label: "Analytics",
        icon: ChartColumn,
        permission: PERMISSIONS.ANALYTICS_READ,
      },
    ],
  },
  {
    label: "Work",
    items: [
      { href: "/admin/projects", label: "Projects", icon: FolderKanban, permission: content },
      { href: "/admin/research", label: "Research", icon: FlaskConical, permission: content },
      { href: "/admin/publications", label: "Publications", icon: BookOpen, permission: content },
      {
        href: "/admin/presentations",
        label: "Presentations",
        icon: Presentation,
        permission: content,
      },
      { href: "/admin/blog-posts", label: "Writing", icon: PenLine, permission: content },
    ],
  },
  {
    label: "Career",
    items: [
      { href: "/admin/experiences", label: "Experience", icon: Briefcase, permission: content },
      { href: "/admin/education", label: "Education", icon: GraduationCap, permission: content },
      { href: "/admin/skills", label: "Skills", icon: Wrench, permission: content },
      { href: "/admin/credentials", label: "Certifications", icon: Award, permission: content },
    ],
  },
  {
    label: "Library",
    items: [
      { href: "/admin/media", label: "Media", icon: Image, permission: PERMISSIONS.MEDIA_MANAGE },
      {
        href: "/admin/project-categories",
        label: "Project categories",
        icon: FolderTree,
        permission: content,
      },
      { href: "/admin/tags", label: "Tags", icon: Hash, permission: content },
      {
        href: "/admin/blog-categories",
        label: "Writing categories",
        icon: FolderOpen,
        permission: content,
      },
      {
        href: "/admin/skill-categories",
        label: "Skill categories",
        icon: Layers,
        permission: content,
      },
      {
        href: "/admin/credential-providers",
        label: "Providers",
        icon: Building2,
        permission: content,
      },
      {
        href: "/admin/credential-types",
        label: "Credential types",
        icon: Tags,
        permission: content,
      },
    ],
  },
  {
    label: "Site",
    items: [
      { href: "/admin/profile", label: "Profile & CV", icon: UserRound, permission: content },
      { href: "/admin/focus-areas", label: "Focus areas", icon: Target, permission: content },
      { href: "/admin/approach-steps", label: "Approach", icon: Workflow, permission: content },
      { href: "/admin/navigation", label: "Navigation", icon: Menu, permission: content },
      { href: "/admin/social-links", label: "Social links", icon: Link2, permission: content },
      { href: "/admin/seo", label: "SEO", icon: Globe, permission: PERMISSIONS.SETTINGS_MANAGE },
      {
        href: "/admin/settings",
        label: "Settings",
        icon: Settings,
        permission: PERMISSIONS.SETTINGS_MANAGE,
      },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/admin/users", label: "Users", icon: Users, permission: PERMISSIONS.USERS_MANAGE },
      { href: "/admin/roles", label: "Roles", icon: Shield, permission: PERMISSIONS.USERS_MANAGE },
      {
        href: "/admin/sessions",
        label: "Sessions",
        icon: MonitorSmartphone,
        permission: PERMISSIONS.USERS_MANAGE,
      },
      {
        href: "/admin/audit-logs",
        label: "Audit log",
        icon: ScrollText,
        permission: PERMISSIONS.AUDIT_READ,
      },
      {
        href: "/admin/integrations",
        label: "Integrations",
        icon: Plug,
        permission: PERMISSIONS.INTEGRATIONS_MANAGE,
      },
      { href: "/admin/system", label: "System", icon: Server, permission: PERMISSIONS.SYSTEM_READ },
    ],
  },
];

export function isActiveAdminPath(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
