import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { Job } from "@/lib/jobsStore";
import { useState } from "react";

const COLORS = [
  "bg-primary",
  "bg-secondary",
  "bg-yellow-500",
  "bg-destructive",
  "bg-purple-500",
  "bg-blue-500",
];

interface CategoryDetailsProps {
  workers: any[]; // replace with your Worker type if you have one
}

const CategoryDetails = ({ workers }: CategoryDetailsProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const tagCounts: Record<string, number> = {};

  workers.forEach((w) => {
    w.skills?.forEach((skill: string) => {
      tagCounts[skill] = (tagCounts[skill] || 0) + 1;
    });
  });

  const categories = Object.entries(tagCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const maxCount = Math.max(...categories.map((c) => c.count), 1);

  return (
    <Card className="border-none shadow-sm">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 pt-5 px-5 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Category Details</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Detailed breakdown of worker categories
                  </p>
              </div>
              <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="px-5 pb-5 pt-0 space-y-3 max-h-60 overflow-y-auto">
            {categories.map((cat, i) => (
              <div key={cat.name} className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${COLORS[i % COLORS.length]} shrink-0`} />
                <span className="text-sm text-foreground min-w-[200px]">{cat.name}</span>
                <Progress value={(cat.count / maxCount) * 100} className="h-2 flex-1" />
                <span className="text-sm font-semibold text-muted-foreground w-8 text-right">{cat.count}</span>
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default CategoryDetails;
