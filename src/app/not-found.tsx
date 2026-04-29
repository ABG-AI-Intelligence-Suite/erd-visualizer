export default function NotFound() {
  return (
    <div className="h-screen flex flex-col items-center justify-center gap-4">
      <h2 className="text-lg font-semibold">404 — Page not found</h2>
      <p className="text-sm text-muted-foreground">
        The page you are looking for does not exist.
      </p>
      <a
        href="/"
        className="px-4 py-2 text-sm rounded-md border hover:bg-accent"
      >
        Back to home
      </a>
    </div>
  );
}
