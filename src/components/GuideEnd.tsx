/** What the on-screen guide suggests when someone scrolls all the way to the bottom of this page. */
export function GuideEnd({ text, label, href }: { text: string; label?: string; href?: string }) {
  return <span hidden data-guide-end={text} data-guide-end-cta={label} data-guide-end-href={href} />;
}
