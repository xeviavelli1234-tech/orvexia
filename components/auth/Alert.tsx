type AlertProps = {
  children: React.ReactNode;
  variant?: "info" | "success" | "error" | "warning";
};

const styles: Record<NonNullable<AlertProps["variant"]>, string> = {
  info: "bg-[#2563EB]/10 text-[#0F172A] border-[#2563EB]/30",
  success: "bg-[#16A34A]/10 text-[#0F172A] border-[#16A34A]/30",
  error: "bg-[#DC2626]/10 text-[#0F172A] border-[#DC2626]/30",
  warning: "bg-amber-500/10 text-amber-900 border-amber-300/60",
};

export function Alert({ children, variant = "info" }: AlertProps) {
  return (
    <div
      className={`p-3 rounded-lg text-sm border ${styles[variant]} flex gap-2`}
      role="alert"
    >
      <span>{children}</span>
    </div>
  );
}
