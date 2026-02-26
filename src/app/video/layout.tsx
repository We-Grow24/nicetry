"use client";

import React from "react";

/** Full-screen layout for the Video Creator — no admin sidebar constraints */
export default function VideoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-950 text-white">
      {children}
    </div>
  );
}
