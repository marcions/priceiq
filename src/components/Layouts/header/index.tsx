import { createClient } from "@/lib/supabase/server";
import { ThemeToggleSwitch } from "./theme-toggle";
import { Notification } from "./notification";
import { UserInfo } from "./user-info";
import { MenuToggle } from "./menu-toggle";

export async function Header() {
  let user = null;
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    user = session?.user ?? null;
  } catch {
    // Header não bloqueia renderização
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-stroke bg-white px-4 py-3 shadow-sm dark:border-dark-3 dark:bg-gray-dark md:px-6 2xl:px-11">
      <MenuToggle />
      <div className="hidden lg:block" />
      <div className="flex items-center gap-3">
        <ThemeToggleSwitch />
        <Notification />
        <UserInfo user={user} />
      </div>
    </header>
  );
}
