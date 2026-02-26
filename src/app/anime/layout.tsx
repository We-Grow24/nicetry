"use client";

import React from "react";

/** Full-screen layout for the Anime Studio — no admin sidebar constraints */
export default function AnimeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-950 text-white">
      {children}
    </div>
  );
}
