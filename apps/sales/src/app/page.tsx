export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="rounded-full bg-pe-blue-500 px-3 py-1 text-xs font-medium uppercase tracking-wider text-white">
        PE Platform
      </span>
      <h1 className="text-4xl font-semibold tracking-tight">Sales</h1>
      <p className="max-w-md text-balance text-muted-foreground">
        Coming soon — the existing pe-sales-dashboard migrates here once the
        platform foundation is stable.
      </p>
    </main>
  );
}
