/** Label / value rows of the store page cards. */
export function Rows({ children }: { children: React.ReactNode }) {
  return <dl className="grid gap-x-6 gap-y-3 text-[15px] sm:grid-cols-[12rem_1fr]">{children}</dl>;
}

export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-ink">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}
