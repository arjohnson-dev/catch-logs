export function getFieldGuideRouteParams(pathname: string) {
  const normalizedPath = pathname.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
  const isFavoritesRoute = normalizedPath === "/resources/field-guide/favorites";
  const detailMatch = normalizedPath.match(/^\/resources\/field-guide\/(.+)$/);

  if (!detailMatch || isFavoritesRoute) {
    return {
      isFavoritesRoute,
      detailSlug: null,
      detailSpecCode: null,
    };
  }

  const routeValue = decodeURIComponent(detailMatch[1]);
  const numericSpecCode = Number.parseInt(routeValue, 10);

  return {
    isFavoritesRoute,
    detailSlug: routeValue,
    detailSpecCode: Number.isNaN(numericSpecCode) ? null : numericSpecCode,
  };
}
