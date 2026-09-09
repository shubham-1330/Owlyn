import Link from "next/link";

export function SectionHeading({
  id,
  title,
  description,
  href,
  hrefLabel = "View all",
}: {
  id?: string;
  title: string;
  description?: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
      <div className="flex flex-col gap-2">
        <h2 id={id} className="text-xl md:text-2xl">
          {title}
        </h2>
        {description ? <p className="measure text-muted-foreground">{description}</p> : null}
      </div>
      {href ? (
        <Link href={href} className="text-sm underline underline-offset-4 hover:text-primary">
          {hrefLabel}
        </Link>
      ) : null}
    </div>
  );
}
