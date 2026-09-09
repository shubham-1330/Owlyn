import Link from "next/link";

import { Wordmark } from "@/components/storefront/wordmark";
import { CONTAINER, GUTTER } from "@/lib/layout";
import { getFooterMenus } from "@/lib/queries/menu";
import { getStoreConfig } from "@/lib/queries/settings";
import { cn } from "@/lib/utils";

export async function Footer() {
  const [columns, config] = await Promise.all([getFooterMenus(), getStoreConfig()]);
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate text-foreground">
      <div
        className={cn(
          CONTAINER,
          GUTTER,
          "grid gap-12 py-16 md:grid-cols-[1.6fr_repeat(3,1fr)] md:py-20",
        )}
      >
        <div className="flex flex-col gap-4">
          <Wordmark className="text-2xl" />
          <p className="max-w-xs measure text-muted-foreground">{config.tagline}</p>
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <p>
              {config.address.city}, {config.address.state}
            </p>
            <a href={`mailto:${config.supportEmail}`} className="w-fit hover:text-foreground">
              {config.supportEmail}
            </a>
            {config.supportHours ? <p>{config.supportHours}</p> : null}
          </div>
        </div>

        {columns.map((column) => (
          <nav key={column.key} aria-label={column.title}>
            <p className="text-sm font-medium">{column.title}</p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {column.links.map((link) => (
                <li key={link.id}>
                  <Link
                    href={link.url}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div
        className={cn(
          CONTAINER,
          GUTTER,
          "flex flex-col gap-2 border-t border-border py-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between",
        )}
      >
        <p>
          © {year} {config.legalName}.{config.gstin ? ` GSTIN ${config.gstin}.` : ""}
        </p>
        <p>UPI, cards, net banking, wallets and cash on delivery. Prices include GST.</p>
        {config.social.instagram ? (
          <a
            href={config.social.instagram}
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            Instagram
          </a>
        ) : null}
      </div>
    </footer>
  );
}
