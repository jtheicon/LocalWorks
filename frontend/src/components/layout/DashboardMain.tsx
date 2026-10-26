import { cn } from "@/lib/utils";

/** Full-width dashboard content area (worker / employer / admin). */
const DashboardMain = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <main className={cn("app-dashboard-main app-dashboard-stack", className)}>{children}</main>
);

export default DashboardMain;
