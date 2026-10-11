// Strich unter einer Reiter-Leiste (siehe DESIGN.md → Reiter): Die Reiter stehen
// mittig zwischen der Linie darüber und diesem Strich – der Abstand nach oben
// (`gap`) ist deshalb derselbe wie der Abstand der Reiter zur Linie darüber.
export function TabRule({ gap = "mt-5" }: { gap?: string }) {
  return <div className={`${gap} mb-6 border-b border-border-subtle`} />;
}
