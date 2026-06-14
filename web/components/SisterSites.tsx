/**
 * Cross-site strip linking the three sister projects (the "0 Series").
 * The same bar lives at the top of NRL 24-0 and Football Invincibles so all
 * three sites point at one another. Self-contained inline styles.
 */
const SITES = [
  { key: "afl", label: "AFL 23-0", href: "https://afl23-0.com" },
  { key: "nrl", label: "NRL 24-0", href: "https://nrl24-0.com" },
  { key: "football", label: "Football Invincibles", href: "https://footballinvincibles.com" },
  { key: "mlb", label: "MLB 162-0", href: "https://mlb162-0.com" },
  { key: "nba", label: "NBA 82-0", href: "https://nba82-0.com" },
  { key: "f1", label: "F1 Slam", href: "https://f1slam.com" },
];

export default function SisterSites({ active }: { active: "afl" | "nrl" | "football" }) {
  return (
    <div
      role="navigation"
      aria-label="Sister sites"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        fontSize: ".74rem",
        padding: "5px 0.6rem",
        paddingTop: "calc(5px + env(safe-area-inset-top))",
        background: "#070c18",
        borderBottom: "1px solid #1e293b",
        overflowX: "auto",
      }}
    >
      <span style={{ color: "#94a3b8", marginRight: 2, fontWeight: 700, fontSize: ".7rem" }}>
        THE 0 SERIES ·
      </span>
      {SITES.map((s) =>
        s.key === active ? (
          <span
            key={s.key}
            aria-current="page"
            style={{
              whiteSpace: "nowrap",
              padding: "3px 9px",
              borderRadius: 999,
              color: "#e2e8f0",
              background: "#1e293b",
              border: "1px solid #334155",
              fontWeight: 600,
            }}
          >
            {s.label}
          </span>
        ) : (
          <a
            key={s.key}
            href={s.href}
            style={{ whiteSpace: "nowrap", padding: "3px 9px", borderRadius: 999, color: "#94a3b8", fontWeight: 600, textDecoration: "none" }}
          >
            {s.label}
          </a>
        )
      )}
    </div>
  );
}
