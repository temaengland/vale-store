import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/cart"],
      },
    ],
    sitemap: "https://charmchase.co.uk/sitemap.xml",
  };
}
