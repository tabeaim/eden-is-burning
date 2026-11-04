"use client";

import { useRouter } from "next/navigation";

// Name, der aufs Charakterprofil führt (Drehbuch, Handy). Kein <a>, damit das
// auch in Zeilen funktioniert, die selbst schon Link oder Knopf sind.
export function ProfileName({
  id,
  className = "",
  children,
}: {
  id: string | undefined;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  if (!id) return <span className={className}>{children}</span>;
  const go = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/charaktere/${id}`);
  };
  return (
    <span
      role="link"
      tabIndex={0}
      title="Zum Profil"
      onClick={go}
      onKeyDown={(e) => e.key === "Enter" && go(e)}
      className={`cursor-pointer hover:underline ${className}`}
    >
      {children}
    </span>
  );
}
