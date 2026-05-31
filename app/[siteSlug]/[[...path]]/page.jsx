import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const ENABLED_ROOT_SITE_SLUGS = new Set(["demo", "vantaianhquoc"]);
const ENABLED_SITE_PATHS = new Set([
  "",
  "dang-nhap",
  "tong-quan",
  "nhap-hang",
  "xuat-hang",
  "bao-cao",
  "quan-ly",
  "cai-dat",
]);

export default async function RootSitePage({ params }) {
  const { path = [], siteSlug } = await params;
  const joinedPath = path.join("/");

  if (!ENABLED_ROOT_SITE_SLUGS.has(siteSlug) || !ENABLED_SITE_PATHS.has(joinedPath)) {
    notFound();
  }

  return null;
}
