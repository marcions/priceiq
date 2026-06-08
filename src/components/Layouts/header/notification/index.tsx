"use client";

import { useState } from "react";

function BellIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  );
}

export function Notification() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex size-10 items-center justify-center rounded-full border border-stroke bg-gray-2 text-dark transition-colors hover:bg-gray-3 dark:border-dark-3 dark:bg-dark-2 dark:text-dark-6 dark:hover:bg-dark-3"
      >
        <BellIcon />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-stroke bg-white shadow-lg dark:border-dark-3 dark:bg-gray-dark">
            <div className="px-5 py-3.5">
              <h3 className="font-semibold text-dark dark:text-white">Notificações</h3>
            </div>
            <hr className="border-[#E8E8E8] dark:border-dark-3" />
            <div className="px-5 py-8 text-center text-sm text-gray-6">
              Nenhuma notificação
            </div>
          </div>
        </>
      )}
    </div>
  );
}
