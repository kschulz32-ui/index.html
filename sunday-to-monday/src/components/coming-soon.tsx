export function ComingSoon({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <h1 className="text-3xl font-bold">{title}</h1>
      <div className="card mt-6 text-muted">{children}</div>
    </>
  );
}
