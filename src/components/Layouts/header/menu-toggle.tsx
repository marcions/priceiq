"use client";

import { useSidebarContext } from "@/components/Layouts/sidebar/sidebar-context";
import { MenuIcon } from "./icons";

export function MenuToggle() {
  const { toggleSidebar } = useSidebarContext();
  return (
    <button
      onClick={toggleSidebar}
      className="flex size-10 items-center justify-center rounded-sm border border-stroke bg-white text-dark dark:border-dark-3 dark:bg-dark-2 dark:text-dark-6 lg:hidden"
      aria-label="Abrir menu"
    >
      <MenuIcon />
    </button>
  );
}
