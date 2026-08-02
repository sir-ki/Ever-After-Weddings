"use client";

import { useState } from "react";

export default function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="text-sm text-neutral-500 hover:text-neutral-900 hover:underline"
    >
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}
