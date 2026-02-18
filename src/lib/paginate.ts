interface PaginateOpts {
  url: string;
  headers: Record<string, string>;
  maxPages?: number;
}

export async function paginateSchemaRegistry<T>(
  opts: PaginateOpts
): Promise<T[]> {
  const { headers, maxPages = 50 } = opts;
  let url: string | null = opts.url;
  const all: T[] = [];
  let retries = 0;
  const maxRetries = 2;

  for (let page = 0; url && page < maxPages; page++) {
    const res: Response = await fetch(url, { headers });
    if (!res.ok) {
      if (page === 0) throw new Error(`API error ${res.status}`);
      if (retries < maxRetries) {
        retries++;
        page--; // retry same page
        continue;
      }
      break;
    }
    retries = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    const results: T[] = data.results ?? [];
    all.push(...results);

    const next: string | undefined = data._page?.next;
    if (next && results.length > 0 && next.startsWith("/")) {
      const service = opts.url.split("/api/aep/")[1]?.split("/")[0];
      url = `/api/aep/${service}${next}`;
    } else {
      url = null;
    }
  }

  return all;
}

export async function paginateCatalog<T>(
  opts: PaginateOpts
): Promise<Array<T & { id: string }>> {
  const { headers, maxPages = 20 } = opts;
  const limit = 100;
  let start = 0;
  const all: Array<T & { id: string }> = [];

  for (let page = 0; page < maxPages; page++) {
    const separator = opts.url.includes("?") ? "&" : "?";
    const url = `${opts.url}${separator}start=${start}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      if (page === 0) throw new Error(`API error ${res.status}`);
      break;
    }
    const data = await res.json();
    const entries = Object.entries(data).filter(([key]) => !key.startsWith("_"));
    entries.forEach(([id, val]) => all.push({ ...(val as T), id }));

    if (entries.length < limit) break;
    start += limit;
  }

  return all;
}

export async function paginateFlowService<T>(
  opts: PaginateOpts
): Promise<T[]> {
  const { headers, maxPages = 20 } = opts;
  let url: string | null = opts.url;
  const all: T[] = [];

  for (let page = 0; url && page < maxPages; page++) {
    const res: Response = await fetch(url, { headers });
    if (!res.ok) {
      if (page === 0) throw new Error(`API error ${res.status}`);
      break;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    const items: T[] = data.items ?? [];
    all.push(...items);

    const nextHref: string | undefined = data._links?.next?.href;
    if (nextHref && items.length > 0) {
      const proxyBase = "/api/aep/flowservice";
      if (nextHref.startsWith("?")) {
        const basePath = opts.url.split("?")[0];
        url = `${basePath}${nextHref}`;
      } else if (nextHref.startsWith("/")) {
        url = `${proxyBase}${nextHref}`;
      } else {
        url = null;
      }
    } else {
      url = null;
    }
  }

  return all;
}
