// Public share/preview endpoint for worker profiles.
// Returns an HTML page with OpenGraph + Twitter Card meta tags so that
// link unfurlers (WhatsApp, iMessage, Facebook, Twitter/X, LinkedIn, Slack,
// Discord, Telegram, etc.) render a rich preview. Humans get redirected to
// the real SPA profile at https://www.nearkonnect.com/w/{uid}.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const WORKER_UID_REGEX = /^NK-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
const FALLBACK_SITE = Deno.env.get("PUBLIC_SHARE_DOMAIN")?.replace(/\/$/, "") || "https://nearkonnectapp.lovable.app";

const resolveSite = (req: Request): string => {
  // Prefer forwarded host (set by reverse proxies / custom domains)
  const fwdHost = req.headers.get("x-forwarded-host") || req.headers.get("x-original-host");
  const fwdProto = req.headers.get("x-forwarded-proto") || "https";
  if (fwdHost && !fwdHost.includes("supabase.co") && !fwdHost.includes("functions.")) {
    return `${fwdProto}://${fwdHost}`.replace(/\/$/, "");
  }
  // Fallback to Origin/Referer header
  const origin = req.headers.get("origin");
  if (origin && !origin.includes("supabase.co")) return origin.replace(/\/$/, "");
  return FALLBACK_SITE;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const isCrawler = (ua: string) =>
  /bot|crawler|spider|facebookexternalhit|facebot|twitterbot|slackbot|linkedinbot|whatsapp|telegrambot|discordbot|skypeuripreview|preview|embedly|quora|pinterest|redditbot|applebot|googlebot|bingbot|duckduckbot|yandexbot|baiduspider|vkshare|w3c_validator|fetch/i.test(
    ua,
  );

const page = (opts: {
  uid: string;
  title: string;
  description: string;
  image: string;
  url: string;
  redirect: boolean;
}) => {
  const { uid, title, description, image, url, redirect } = opts;
  const t = esc(title);
  const d = esc(description);
  const img = esc(image);
  const u = esc(url);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${t}</title>
<meta name="description" content="${d}" />
<link rel="canonical" href="${u}" />

<meta property="og:type" content="profile" />
<meta property="og:site_name" content="NearKonnect" />
<meta property="og:title" content="${t}" />
<meta property="og:description" content="${d}" />
<meta property="og:url" content="${u}" />
<meta property="og:image" content="${img}" />
<meta property="og:image:secure_url" content="${img}" />
<meta property="og:image:alt" content="${t}" />
<meta property="og:image:width" content="600" />
<meta property="og:image:height" content="600" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${t}" />
<meta name="twitter:description" content="${d}" />
<meta name="twitter:image" content="${img}" />

<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Person",
    name: title,
    description,
    image,
    url,
    identifier: uid,
  })}</script>

${redirect ? `<meta http-equiv="refresh" content="0; url=${u}" />` : ""}
<style>
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#0b0f1a;color:#f5f7fb;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .card{max-width:380px;text-align:center;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:24px;padding:28px}
  img{width:120px;height:120px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,.15);margin-bottom:16px}
  h1{margin:0 0 6px;font-size:20px}
  p{margin:0 0 18px;font-size:14px;color:#9aa3b2;line-height:1.5}
  a{display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px;font-weight:600;font-size:14px}
</style>
</head>
<body>
  <div class="card">
    <img src="${img}" alt="${t}" onerror="this.style.display='none'" />
    <h1>${t}</h1>
    <p>${d}</p>
    <a href="${u}">Open profile</a>
  </div>
  ${redirect ? `<script>window.location.replace(${JSON.stringify(url)});</script>` : ""}
</body>
</html>`;
};

Deno.serve(async (req) => {
  const url = new URL(req.url);
  // Match the uid as the last path segment, e.g. /worker-share/NK-AB3X9P
  const parts = url.pathname.split("/").filter(Boolean);
  const raw = (parts[parts.length - 1] || "").toUpperCase();
  const uid = raw.trim();

  if (!WORKER_UID_REGEX.test(uid)) {
    return new Response("Invalid worker ID", {
      status: 400,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const SITE = resolveSite(req);
  const profileUrl = `${SITE}/w/${uid}`;
  const ua = req.headers.get("user-agent") || "";
  const crawler = isCrawler(ua);

  const { data: worker } = await supabase
    .from("workers")
    .select(
      "id, profession, main_category, sub_category, city, experience, verified, available, description, user_id",
    )
    .eq("uid", uid)
    .maybeSingle();

  if (!worker) {
    return new Response(
      page({
        uid,
        title: "Worker not found · NearKonnect",
        description: "This NearKonnect profile is no longer available.",
        image: `${SITE}/favicon.svg`,
        url: profileUrl,
        redirect: !crawler,
      }),
      {
        status: 404,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=60",
        },
      },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, city")
    .eq("user_id", worker.user_id)
    .maybeSingle();

  const name = profile?.full_name?.trim() || "NearKonnect Worker";
  const profession = worker.profession || worker.sub_category || worker.main_category || "Service Pro";
  const city = profile?.city || worker.city || "";
  const expYears = worker.experience
    ? `${worker.experience} yr${worker.experience === 1 ? "" : "s"} exp`
    : "";
  const verified = worker.verified ? "Verified" : "";

  const title = `${name} · ${profession}${verified ? " ✓" : ""}`;
  const descParts = [
    profession,
    city,
    expYears,
    verified,
    worker.available ? "Available now" : null,
  ].filter(Boolean);
  const description =
    (worker.description?.trim() ? worker.description.trim().slice(0, 140) + " · " : "") +
    descParts.join(" · ") +
    ` · Connect on NearKonnect (ID ${uid})`;

  const image = profile?.avatar_url || `${SITE}/favicon.svg`;

  return new Response(
    page({
      uid,
      title,
      description,
      image,
      url: profileUrl,
      redirect: !crawler,
    }),
    {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300, s-maxage=600",
      },
    },
  );
});
