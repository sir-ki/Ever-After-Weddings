// Photography placeholder — striped box + monospace caption naming the
// shot and aspect ratio, exactly the pattern the design reference uses.
// No stock photography per the brand brief; real photos drop in after
// the first wedding (see the marketing README's own framing).
export function PlaceholderImage({
  caption,
  aspectRatio,
  className = "",
  style,
}: {
  caption: string;
  aspectRatio: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`mkt-placeholder ${className}`}
      style={{ aspectRatio, ...style }}
    >
      <span className="mkt-placeholder__caption">{caption}</span>
    </div>
  );
}
