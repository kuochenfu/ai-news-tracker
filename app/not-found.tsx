import { sitePath } from "@/src/paths";

export default function NotFound() {
  const target = sitePath("/trends/");

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <script
        dangerouslySetInnerHTML={{
          __html: `window.location.replace(${JSON.stringify(target)});`
        }}
      />
      <h1 className="text-xl font-bold">這份快照已更新</h1>
      <p className="max-w-md text-body text-ink-2">這個連結屬於較早的發布，正在帶你前往最新的各站排行。</p>
      <a href={target} className="rounded-[3px] bg-shell px-4 py-2 text-body font-semibold text-shell-ink hover:no-underline">
        開啟各站排行
      </a>
    </div>
  );
}
