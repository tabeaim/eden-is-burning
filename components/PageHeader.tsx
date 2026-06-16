export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="font-serif text-2xl text-text-primary leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[13px] text-text-secondary mt-1">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}
