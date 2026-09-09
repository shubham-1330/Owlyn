import { CACHE_TAGS, cached } from "@/lib/cache";
import { db } from "@/lib/db";

export type MenuLink = { id: string; label: string; url: string; image: string | null };
export type MenuGroup = { title: string; links: MenuLink[] };
export type MenuPanel = {
  id: string;
  label: string;
  url: string;
  groups: MenuGroup[];
  tiles: MenuLink[];
};

/** Child items in this group render as image tiles instead of link columns. */
const TILE_GROUP = "tiles";

type Row = {
  id: string;
  label: string;
  url: string;
  image: string | null;
  group: string | null;
  parentId: string | null;
};

function toLink(row: Row): MenuLink {
  return { id: row.id, label: row.label, url: row.url, image: row.image };
}

/** Top-level panels for the header mega menu, with grouped link columns and image tiles. */
export const getMainMenu = cached(
  async (): Promise<MenuPanel[]> => {
    const rows = await db.menuItem.findMany({
      where: { menu: "main", isActive: true },
      orderBy: { position: "asc" },
      select: { id: true, label: true, url: true, image: true, group: true, parentId: true },
    });
    const roots = rows.filter((r) => r.parentId === null);
    return roots.map((root) => {
      const children = rows.filter((r) => r.parentId === root.id);
      const order: string[] = [];
      const grouped = new Map<string, MenuLink[]>();
      const tiles: MenuLink[] = [];
      for (const child of children) {
        if (child.group === TILE_GROUP) {
          tiles.push(toLink(child));
          continue;
        }
        const title = child.group ?? "More";
        if (!grouped.has(title)) {
          grouped.set(title, []);
          order.push(title);
        }
        grouped.get(title)!.push(toLink(child));
      }
      return {
        id: root.id,
        label: root.label,
        url: root.url,
        groups: order.map((title) => ({ title, links: grouped.get(title)! })),
        tiles,
      };
    });
  },
  ["menu:main"],
  [CACHE_TAGS.menus],
);

export type FooterColumn = { key: string; title: string; links: MenuLink[] };

const FOOTER_MENUS: Array<{ key: string; title: string }> = [
  { key: "footer-shop", title: "Shop" },
  { key: "footer-help", title: "Help" },
  { key: "footer-company", title: "Company" },
];

export const getFooterMenus = cached(
  async (): Promise<FooterColumn[]> => {
    const rows = await db.menuItem.findMany({
      where: { menu: { in: FOOTER_MENUS.map((m) => m.key) }, isActive: true, parentId: null },
      orderBy: { position: "asc" },
      select: {
        id: true,
        label: true,
        url: true,
        image: true,
        group: true,
        parentId: true,
        menu: true,
      },
    });
    return FOOTER_MENUS.map((menu) => ({
      key: menu.key,
      title: menu.title,
      links: rows.filter((r) => r.menu === menu.key).map(toLink),
    }));
  },
  ["menu:footer"],
  [CACHE_TAGS.menus],
);
