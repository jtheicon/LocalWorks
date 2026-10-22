import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type PublicListingSkeletonProps = {
  variant: "workers" | "jobs";
  count?: number;
};

export function PublicListingSkeleton({ variant, count = 6 }: PublicListingSkeletonProps) {
  if (variant === "jobs") {
    return (
      <div className="grid gap-4" aria-busy="true" aria-label="Loading jobs">
        {Array.from({ length: Math.min(count, 3) }, (_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-7 w-2/3 max-w-md" />
              <Skeleton className="mt-2 h-4 w-48" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-9 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
      aria-busy="true"
      aria-label="Loading workers"
    >
      {Array.from({ length: count }, (_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="flex gap-4">
              <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
