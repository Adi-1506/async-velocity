export const dynamic = "force-dynamic";
export function GET() {
  const contact = process.env.SECURITY_CONTACT || "";
  const expires = Date.parse(process.env.SECURITY_EXPIRES || "");
  try {
    const url = new URL(contact);
    if (
      !["mailto:", "https:"].includes(url.protocol) ||
      /[\r\n]/.test(contact) ||
      !Number.isFinite(expires) ||
      expires <= Date.now() ||
      expires > Date.now() + 366 * 86400000
    )
      throw new Error();
  } catch {
    return new Response("Disclosure contact is not configured", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }
  return new Response(
    `Contact: ${contact}\nExpires: ${new Date(expires).toISOString()}\nPreferred-Languages: en\n`,
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}
