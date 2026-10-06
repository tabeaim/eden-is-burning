import type { SVGProps } from "react";

type IconName =
  | "dashboard"
  | "book"
  | "map"
  | "calendar"
  | "users"
  | "info"
  | "settings"
  | "star"
  | "quote"
  | "heart"
  | "pinterest"
  | "photo"
  | "camera"
  | "spotify"
  | "message"
  | "arrow-right"
  | "logout"
  | "plus"
  | "edit"
  | "upload"
  | "download"
  | "flame"
  | "match"
  | "match-lit"
  | "match-burnt"
  | "sidebar"
  | "au"
  | "refresh"
  | "search"
  | "check"
  | "trash"
  | "copy"
  | "pause"
  | "play"
  | "chevron-right"
  | "phone"
  | "home"
  | "volume"
  | "mute"
  | "more";

const paths: Record<IconName, React.ReactNode> = {
  dashboard: (
    <>
      <rect x="4" y="4" width="6" height="8" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="12" width="6" height="8" rx="1" />
    </>
  ),
  book: (
    <>
      <path d="M3 19a9 9 0 0 1 9 0 9 9 0 0 1 9 0" />
      <path d="M3 6a9 9 0 0 1 9 0 9 9 0 0 1 9 0" />
      <path d="M3 6v13M12 6v13M21 6v13" />
    </>
  ),
  map: (
    <>
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
      <path d="M9 4v14M15 6v14" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M4 10h16" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M16 5.1a3 3 0 0 1 0 5.8M21 20a6 6 0 0 0-3.5-5.5" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 6 19.4l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4 13.6H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 6l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 10 4.6V4a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 18 6l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 20.4 12H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </>
  ),
  star: <path d="m12 4 2.4 5 5.5.8-4 3.9.9 5.5-4.8-2.6L7.2 19l.9-5.5-4-3.9 5.5-.8L12 4Z" />,
  quote: (
    <>
      <path d="M7 8h4v4a4 4 0 0 1-4 4M14 8h4v4a4 4 0 0 1-4 4" />
    </>
  ),
  heart: (
    <path d="M12 20s-7-4.5-9.5-9A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 9.5 4c-2.5 4.5-9.5 9-9.5 9Z" />
  ),
  pinterest: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 20c-.3-1.5.2-3.5.6-5 .3-1.2 1-4 1-4s-.3-.6-.3-1.5c0-1.4.8-2.4 1.8-2.4.9 0 1.3.7 1.3 1.5 0 .9-.6 2.3-.9 3.5-.2 1 .5 1.9 1.5 1.9 1.8 0 3-2.3 3-5 0-2-1.4-3.5-3.9-3.5-2.8 0-4.6 2.1-4.6 4.4 0 .8.3 1.4.7 1.8.2.2.2.3.1.5l-.2.9c0 .2-.2.3-.4.2-1.2-.5-1.8-1.9-1.8-3.4 0-2.5 2.1-5.6 6.4-5.6 3.4 0 5.7 2.5 5.7 5.2 0 3.5-2 6.2-4.9 6.2-1 0-1.9-.5-2.2-1.2l-.6 2.4c-.2.8-.7 1.7-1.1 2.4" />
    </>
  ),
  photo: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m4 17 5-4 4 3 3-2 4 3" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13" r="3.2" />
    </>
  ),
  spotify: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M7.5 10.5c3-1 6-.8 8.5.7M8 14c2.3-.7 4.6-.5 6.5.6M8.5 16.8c1.7-.5 3.4-.4 4.9.4" />
    </>
  ),
  message: (
    <path d="M4 5h16v11H9l-4 3v-3H4V5Z" />
  ),
  "arrow-right": <path d="M4 12h15m-6-6 6 6-6 6" />,
  "chevron-right": <path d="m9 6 6 6-6 6" />,
  phone: (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2.2" />
      <path d="M11 18h2" />
    </>
  ),
  logout: (
    <>
      <path d="M14 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2" />
      <path d="M20 12H10m6-4 4 4-4 4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  edit: (
    <>
      <path d="M4 20h4l10-10a2 2 0 0 0-3-3L5 17v3Z" />
      <path d="m13.5 6.5 3 3" />
    </>
  ),
  upload: (
    <>
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      <path d="M12 16V4m-5 5 5-5 5 5" />
    </>
  ),
  download: (
    <>
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      <path d="M12 4v12m-5-5 5 5 5-5" />
    </>
  ),
  flame: (
    <path d="M12 3c.5 3-1.5 4-2.8 5.5C8 10 7 11.4 7 13.5A5 5 0 0 0 17 13.5c0-2-1-3.2-2-4.5-.8 1-1.5 1.5-2.4 1.6.7-2 .4-5-.6-7.6Z" />
  ),
  // Streichholz – Szenen-Status: unangezündet, brennend, abgebrannt
  match: (
    <>
      <path d="M4 20.5 14.2 10.3" />
      <ellipse cx="16" cy="8.5" rx="2.5" ry="2" transform="rotate(-45 16 8.5)" fill="currentColor" />
    </>
  ),
  "match-lit": (
    <>
      <path d="M4 20.5 12.5 12" />
      <path
        d="M15.9 2.6c.4 2.1-1 2.8-2 3.9-.8.9-1.5 1.9-1.5 3.3a3.5 3.5 0 0 0 7 0c0-1.4-.7-2.2-1.4-3.1-.6.7-1 1-1.7 1.1.5-1.4.3-3.4-.4-5.2Z"
        fill="currentColor"
        fillOpacity="0.25"
      />
    </>
  ),
  "match-burnt": (
    <>
      <path d="M4 20.5 12.6 11.9" />
      <circle cx="13.4" cy="11.1" r="1.1" fill="currentColor" />
      <path d="M14.8 8.4c1.3-1.2-.9-2.1.3-3.5s-.5-1.9.3-3.1" strokeWidth={1.2} />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 0 0-14.6-4.6L4 8" />
      <path d="M4 4v4h4" />
      <path d="M4 13a8 8 0 0 0 14.6 4.6L20 16" />
      <path d="M20 20v-4h-4" />
    </>
  ),
  // Alternate Universe: ein Zeitstrahl, der sich spaltet
  au: (
    <>
      <path d="M3 12h6" />
      <path d="M9 12c4.5 0 3.5-5.5 8-5.5h4" />
      <path d="M9 12c4.5 0 3.5 5.5 8 5.5h4" />
    </>
  ),
  // Seitenleiste ein-/ausblenden
  sidebar: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M9.5 4v16" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </>
  ),
  pause: (
    <>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </>
  ),
  play: <path d="M6 4l14 8-14 8V4z" />,
  home: (
    <>
      <path d="M4 11l8-7 8 7" />
      <path d="M6 10v10h12V10" />
    </>
  ),
  volume: (
    <>
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7" />
    </>
  ),
  mute: (
    <>
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M16.5 9.5l5 5M21.5 9.5l-5 5" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="19" cy="12" r="1.2" />
    </>
  ),
};

export function Icon({
  name,
  size = 18,
  ...props
}: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}

export type { IconName };
