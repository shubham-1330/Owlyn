import { HeaderShell } from "@/components/storefront/header/header-shell";
import { getSessionUser, hasRole, STAFF_ROLES } from "@/lib/auth/guards";
import { getMainMenu } from "@/lib/queries/menu";
import { getStoreConfig } from "@/lib/queries/settings";

/** Server half of the header. Bag and wishlist counts come from the providers, not from here. */
export async function Header() {
  const [menu, user, config] = await Promise.all([
    getMainMenu(),
    getSessionUser(),
    getStoreConfig(),
  ]);

  return (
    <HeaderShell
      menu={menu}
      isSignedIn={Boolean(user)}
      isStaff={hasRole(user, STAFF_ROLES)}
      trending={config.trendingSearches}
    />
  );
}
