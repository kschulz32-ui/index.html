export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col justify-center px-5 py-10">
      <p className="label mb-3">Sunday to Monday</p>
      {children}
    </main>
  );
}
