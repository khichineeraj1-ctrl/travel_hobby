/** Shown instantly while the next page renders on the server — clicks feel immediate. */
export default function Loading() {
  return (
    <div className="wrap animate-pulse pt-10" aria-busy="true" aria-label="Loading">
      <div className="fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden">
        <div className="h-full w-1/3 animate-[loadbar_1s_ease-in-out_infinite] bg-gradient-to-r from-[#ff7a18] via-[#a855f7] to-[#0071e3]" />
      </div>
      <div className="h-3 w-40 rounded-full bg-line/70" />
      <div className="mt-6 h-12 w-3/4 max-w-2xl rounded-2xl bg-line/70 sm:h-16" />
      <div className="mt-4 h-5 w-2/3 max-w-xl rounded-full bg-line/50" />
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-64 rounded-apple bg-white shadow-tile" />)}
      </div>
    </div>
  );
}
