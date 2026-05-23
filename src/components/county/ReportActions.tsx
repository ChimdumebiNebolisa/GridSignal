"use client";

import { useState } from "react";
import { buildCountyReport } from "@/lib/report/buildCountyReport";
import type { CountyEnergyProfile } from "@/types/county";

type ReportActionsProps = {
  profile: CountyEnergyProfile;
};

export function ReportActions({ profile }: ReportActionsProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const text = buildCountyReport(profile);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  function handleDownload() {
    const text = buildCountyReport(profile);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gridsignal-${profile.countyFips}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={handleCopy}
        className="rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900"
        aria-label="Copy county report to clipboard"
      >
        {copied ? "Report copied" : "Copy report"}
      </button>
      <button
        type="button"
        onClick={handleDownload}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        aria-label="Download county report as text file"
      >
        Download .txt
      </button>
    </div>
  );
}
