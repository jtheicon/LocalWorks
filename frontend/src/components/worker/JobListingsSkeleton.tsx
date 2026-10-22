import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const JobListingsSkeleton = () => (
  <div className="grid gap-4" aria-busy="true" aria-label="Loading jobs">
    {[0, 1, 2].map((i) => (
      <Card key={i}>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-2/3 max-w-sm" />
          <Skeleton className="mt-2 h-4 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-4 w-3/4 max-w-sm" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-28" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

export default JobListingsSkeleton;
