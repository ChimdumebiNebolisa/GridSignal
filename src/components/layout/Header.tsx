export function Header() {
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "GridSignal Texas";

  return (
    <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">
          {appName}
        </h1>
        <p className="text-xs text-slate-500">
          Texas county backup energy planning priority map
        </p>
      </div>
    </header>
  );
}
