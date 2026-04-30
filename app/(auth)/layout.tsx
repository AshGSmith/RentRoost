import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <div className="flex items-center justify-center px-4 py-12 md:px-8">{children}</div>
      <div className="hidden bg-brand-950 p-10 text-white lg:flex">
        <div className="flex max-w-lg flex-col justify-between">
          <div className="space-y-6">
            <Link className="inline-flex items-center gap-3" href="/login">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-xl font-semibold">
                R
              </div>
              <div>
                <p className="text-xl font-semibold">RentRoost</p>
                <p className="text-sm text-brand-100/70">Property finance and operations</p>
              </div>
            </Link>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight">
                One calm workspace for tenancy finance, compliance and reporting.
              </h1>
              <p className="text-base leading-7 text-brand-50/80">
                Built for modern operators who need secure tenant-safe workflows, auditability and a
                clean daily control centre.
              </p>
            </div>
          </div>

          <div className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <p className="text-sm font-medium text-brand-100">MVP foundation included</p>
            <div className="grid gap-3 text-sm text-brand-50/80">
              <p>Tenant-safe data access tied to the signed-in account</p>
              <p>Admin impersonation with audit logging</p>
              <p>Organisation settings ready for future PDFs and templates</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
