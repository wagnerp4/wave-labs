import {
  Activity,
  AudioLines,
  Boxes,
  Cable,
  BookOpen,
  FileAudio,
  Home,
  Mic2,
  ScrollText,
  Settings,
  type LucideIcon
} from "lucide-react";

export type Screen =
  | "launchpad"
  | "studio"
  | "transcribe"
  | "voices"
  | "audiobooks"
  | "models"
  | "api"
  | "logs"
  | "settings";

export type NavItem = { id: Screen; label: string; icon: LucideIcon; group: "create" | "manage" };

export const NAV: NavItem[] = [
  { id: "launchpad", label: "Launchpad", icon: Home, group: "create" },
  { id: "studio", label: "Studio", icon: AudioLines, group: "create" },
  { id: "transcribe", label: "Transcribe", icon: FileAudio, group: "create" },
  { id: "voices", label: "Voices", icon: Mic2, group: "create" },
  { id: "audiobooks", label: "Audiobooks", icon: BookOpen, group: "create" },
  { id: "models", label: "Models", icon: Boxes, group: "manage" },
  { id: "api", label: "Local API", icon: Cable, group: "manage" },
  { id: "logs", label: "Logs", icon: ScrollText, group: "manage" },
  { id: "settings", label: "Settings", icon: Settings, group: "manage" }
];

export const ACTIVITY_ICON = Activity;
