/**
 * Serialise a JSON-LD object for safe injection via dangerouslySetInnerHTML.
 * JSON.stringify does NOT escape `<`, `>` or `&`, so a scraped name containing
 * `</script>` could break out of the <script type="application/ld+json"> tag
 * and execute. Escape those characters — valid inside a JSON string, inert as
 * HTML.
 */
export function jsonLd(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
