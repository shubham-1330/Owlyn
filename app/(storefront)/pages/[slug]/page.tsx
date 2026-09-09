import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContactForm } from "@/components/storefront/contact-form";
import { Markdown } from "@/components/storefront/markdown";
import { getSessionUser } from "@/lib/auth/guards";
import { GUTTER } from "@/lib/layout";
import { getPublishedPage } from "@/lib/queries/pages";
import { cn } from "@/lib/utils";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublishedPage(slug);
  if (!page) return {};
  return {
    title: page.metaTitle ? { absolute: page.metaTitle } : page.title,
    description: page.metaDescription ?? page.excerpt ?? undefined,
    alternates: { canonical: `/pages/${slug}` },
  };
}

export default async function CmsPage({ params }: { params: Params }) {
  const { slug } = await params;
  const page = await getPublishedPage(slug);
  if (!page) notFound();

  const updated = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(page.updatedAt));

  return (
    <article className={cn("mx-auto w-full max-w-3xl py-14 md:py-20", GUTTER)}>
      <header className="flex flex-col gap-3 pb-10">
        <h1 className="text-2xl md:text-3xl">{page.title}</h1>
        {page.excerpt ? (
          <p className="measure text-lg text-muted-foreground">{page.excerpt}</p>
        ) : null}
      </header>

      <Markdown content={page.body} />

      {slug === "contact" ? <ContactSection /> : null}

      <p className="pt-12 text-xs text-muted-foreground">Last updated {updated}.</p>
    </article>
  );
}

async function ContactSection() {
  const user = await getSessionUser();
  return (
    <section aria-labelledby="contact-form-heading" className="mt-14 flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 id="contact-form-heading" className="text-xl">
          Send us a message
        </h2>
        <p className="text-muted-foreground">Order questions, sizing, returns, anything else.</p>
      </div>
      <ContactForm defaultName={user?.name ?? undefined} defaultEmail={user?.email ?? undefined} />
    </section>
  );
}
