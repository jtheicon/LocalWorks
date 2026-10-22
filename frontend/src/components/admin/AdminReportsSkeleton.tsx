import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const AdminReportsSkeleton = () => (
  <div className="space-y-6" aria-busy="true" aria-label="Loading reports">
    <div className="flex justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-9 w-32" />
    </div>
    <Skeleton className="h-10 w-full max-w-xl" />
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      <Card className="border-none shadow-sm">
        <CardContent className="p-5 space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
      <div className="space-y-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-5 space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
);

export default AdminReportsSkeleton;
