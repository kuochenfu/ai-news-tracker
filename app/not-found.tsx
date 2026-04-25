import { sitePath } from "@/src/paths";

export default function NotFound() {
  const target = sitePath("/trends/");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <script
        dangerouslySetInnerHTML={{
          __html: `window.location.replace(${JSON.stringify(target)});`
        }}
      />
      <h1 className="text-3xl font-semibold">Trend snapshot changed</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        This detail link belonged to an older scheduled snapshot. Redirecting to the current trend details.
      </p>
      <a href={target} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
        Open current trend details
      </a>
    </div>
  );
}

