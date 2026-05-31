import { notFound } from "next/navigation";
import { FetSiteLayout } from "@/components/fet/fet-site-layout";

export const dynamic = "force-dynamic";

const ENABLED_ROOT_SITE_SLUGS = new Set(["demo", "vantaianhquoc"]);

export default async function RootSiteLayout({ children, params }) {
  const { siteSlug } = await params;
  if (!ENABLED_ROOT_SITE_SLUGS.has(siteSlug)) {
    notFound();
  }

  return (
    <>
      <FetSiteLayout siteSlug={siteSlug} />
      {children}
    </>
  );
}
