import type { Metadata } from "next";
import { Noto_Sans_TC, Public_Sans } from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";

import { IntensityLegend } from "@/components/Intensity";
import { NextIssue } from "@/components/NextIssue";
import { SiteNav } from "@/components/SiteNav";
import { currentBulletin, formatTaipei } from "@/src/bulletin";

import "./globals.css";

const latin = Public_Sans({ subsets: ["latin"], variable: "--font-latin", display: "swap" });
const cjk = Noto_Sans_TC({ weight: ["400", "500", "700"], variable: "--font-cjk", display: "swap", preload: false });

export const metadata: Metadata = {
  title: "AI 訊號觀測",
  description: "每日兩次彙整一手來源、開發者社群、平台採用與科技媒體的 AI 訊號。"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const bulletin = currentBulletin();

  return (
    <html lang="zh-Hant-TW" className={`${latin.variable} ${cjk.variable}`}>
      <body className="min-h-screen font-sans text-body antialiased">
        <header className="bg-shell text-shell-ink">
          <div className="mx-auto flex max-w-7xl flex-col px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:px-8">
            <div className="flex items-center justify-between gap-6">
              <Link href="/" className="py-2.5 text-head font-bold tracking-tight hover:no-underline">
                AI 訊號觀測
              </Link>
            </div>
            <SiteNav />
          </div>
          <div className="border-t border-shell-rule">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-2 text-meta sm:px-6 lg:px-8">
              <p>
                <span className="text-shell-ink-2">發布 </span>
                <time className="num font-semibold" dateTime={bulletin.issuedAt}>
                  {formatTaipei(bulletin.issuedAt)}
                </time>
              </p>
              <NextIssue at={bulletin.nextIssueAt} label={formatTaipei(bulletin.nextIssueAt)} />
              <p className="num">
                <span className="font-semibold">{bulletin.stationCount}</span>
                <span className="text-shell-ink-2"> 站 · </span>
                <span className="font-semibold">{bulletin.observationCount}</span>
                <span className="text-shell-ink-2"> 筆排名</span>
                {bulletin.troubledCount > 0 ? (
                  <span className="ml-2 font-bold text-shell-ink underline decoration-dotted underline-offset-2">{bulletin.troubledCount} 站異常</span>
                ) : null}
              </p>
              <p className="hidden text-shell-ink-2 sm:block">台北時間</p>
              <div className="w-full sm:ml-auto sm:w-auto">
                <IntensityLegend />
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </body>
    </html>
  );
}
