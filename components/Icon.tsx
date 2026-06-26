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
  | "flame"
  | "search";

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
  flame: (
    <path d="M12 3c.5 3-1.5 4-2.8 5.5C8 10 7 11.4 7 13.5A5 5 0 0 0 17 13.5c0-2-1-3.2-2-4.5-.8 1-1.5 1.5-2.4 1.6.7-2 .4-5-.6-7.6Z" />
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
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
