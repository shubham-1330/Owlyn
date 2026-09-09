import { HeaderShell } from "@/components/storefront/header/header-shell";
import { getSessionUser, hasRole, STAFF_ROLES } from "@/lib/auth/guards";
import { getCartToken } from "@/lib/cart/cookies";
import { getHeaderCounts } from "@/lib/queries/counts";
import { getMainMenu } from "@/lib/queries/menu";
import { getStoreConfig } from "@/lib/queries/settings";

/** Server half of the header: loads menu, session and counts, hands them to the client shell. */
export async function Header() {
  const [menu, user, cartToken, config] = await Promise.all([
    getMainMenu(),
    getSessionUser(),
    getCartToken(),
    getStoreConfig(),
  ]);
  const counts = await getHeaderCounts(user?.id ?? null, cartToken);

  return (
    <HeaderShell
      menu={menu}
      counts={counts}
      isSignedIn={Boolean(user)}
      isStaff={hasRole(user, STAFF_ROLES)}
      trending={config.trendingSearches}
    />
  );
}
