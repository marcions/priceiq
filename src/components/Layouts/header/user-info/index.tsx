"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}
function LogOutIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
    </svg>
  );
}

export function UserInfo({ user }: { user: User | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    setIsOpen(false);
    const loadingId = toast.loading("Saindo...");
    try {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
      toast.success("Sessão encerrada");
    } catch {
      toast.error("Erro ao sair");
    } finally {
      toast.dismiss(loadingId);
    }
  }

  const name = user?.user_metadata?.name || user?.email?.split("@")[0] || "Usuário";
  const email = user?.email || "";
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex cursor-pointer items-center gap-3 rounded align-middle outline-none ring-primary ring-offset-2 focus-visible:ring-1 dark:ring-offset-gray-dark"
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
          {initials}
        </span>
        <span className="flex items-center gap-1 font-medium text-dark max-[1024px]:hidden dark:text-dark-6">
          <span className="max-w-24 truncate">{name}</span>
          <ChevronUpIcon className={cn("rotate-180 transition-transform", isOpen && "rotate-0")} />
        </span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 min-w-60 rounded-xl border border-stroke bg-white shadow-lg dark:border-dark-3 dark:bg-gray-dark">
            <div className="flex items-center gap-2.5 px-5 py-3.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                {initials}
              </span>
              <div className="space-y-0.5">
                <div className="text-sm font-semibold text-dark dark:text-white">{name}</div>
                <div className="max-w-44 truncate text-xs text-gray-6">{email}</div>
              </div>
            </div>

            <hr className="border-[#E8E8E8] dark:border-dark-3" />

            <div className="p-2 text-sm text-[#4B5563] dark:text-dark-6">
              <button
                onClick={handleLogout}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white"
              >
                <LogOutIcon />
                <span className="font-medium">Sair</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
