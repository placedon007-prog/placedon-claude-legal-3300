import type { Metadata } from "next";
import type { SiteRoute } from "./placedon-content/content/types";
import {
  metadataForRoute,
  routeMetadata,
} from "./placedon-content/seo/metadata";

/**
 * Per-route metadata that degrades safely before a public origin is confirmed.
 *
 * `metadataForRoute` needs a validated HTTPS origin and throws without one, so
 * canonical/OG URLs only appear once `SITE_ORIGIN` is set on the reviewed
 * deployment. Until then a page still gets a correct title, description, and
 * an honest `noindex` — never a canonical pointing at a guessed domain.
 */
export function pageMetadata(route: SiteRoute): Metadata {
  const origin = process.env.SITE_ORIGIN?.trim();
  const publicationReady = process.env.SITE_PUBLICATION_READY === "true";
  if (origin) {
    try {
      return metadataForRoute(route, { origin, publicationReady });
    } catch {
      // Misconfigured origin: fall through to the pre-launch shape rather than
      // failing the render.
    }
  }
  const copy = routeMetadata[route];
  return {
    title: { absolute: copy.title },
    description: copy.description,
    robots: { index: false, follow: false },
  };
}
