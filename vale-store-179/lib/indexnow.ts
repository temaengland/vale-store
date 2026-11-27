import "server-only";

const INDEXNOW_KEY = "1e8e60fdc1510e74baa8a1a62bb35a9a";
const HOST = "www.charmchase.co.uk";

// Notifies IndexNow (a shared protocol used by Bing, Yandex and others)
// that one or more pages have just been added, changed, or removed — so
// they can be re-crawled within minutes instead of waiting for the next
// scheduled visit. Never throws: a failure here should never block the
// actual product save that triggered it.
export async function notifyIndexNow(urls: string[]) {
  if (urls.length === 0) return;
  try {
    await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: HOST,
        key: INDEXNOW_KEY,
        keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
        urlList: urls,
      }),
    });
  } catch {
    // Best-effort only — search engine indexing hiccups shouldn't ever
    // surface as an error to the person adding a product.
  }
}
