interface ComingSoonProps {
  title: string;
  description?: string;
  phase?: string;
}

export default function ComingSoon({ title, description, phase }: ComingSoonProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md bg-white dark:bg-navy-700 rounded-xl border border-gray-100 dark:border-navy-600 shadow-sm p-10">
        <div className="text-5xl">🚧</div>
        <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
        {description && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{description}</p>
        )}
        {phase && (
          <p className="mt-4 text-[11px] uppercase tracking-wider text-primary font-semibold">
            Lands in {phase}
          </p>
        )}
      </div>
    </div>
  );
}
