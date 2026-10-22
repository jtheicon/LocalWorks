import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8920";

const ReactivationRequest = () => {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["reactivation", token],
    enabled: token.length >= 16,
    queryFn: async () => {
      const res = await axios.get(`${API}/api/account/reactivation/request`, { params: { token } });
      return res.data;
    },
    retry: false,
  });

  const submit = useMutation({
    mutationFn: async () => {
      const res = await axios.post(`${API}/api/account/reactivation/request`, { token });
      return res.data;
    },
    onSuccess: (body) => {
      setSubmitted(true);
      toast.success(body.message);
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? "Could not submit request");
    },
  });

  if (!token || token.length < 16) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Invalid link</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-4">
            <p>This reactivation link is missing or invalid. Check the email we sent when your account was deactivated.</p>
            <Button asChild variant="outline">
              <Link to="/login">Go to sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Link not valid</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {(error as any).response?.data?.message ?? "This reactivation link cannot be used."}
          </CardContent>
        </Card>
      </div>
    );
  }

  const pending = data?.reactivationRequestStatus === "pending";

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle>Account reactivation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>
            Hello <strong>{data.displayName}</strong>, your LocalWorks account is currently{" "}
            <strong>deactivated</strong>
            {data.deactivationReason === "inactivity" ? " due to inactivity" : ""}.
          </p>
          {submitted || pending ? (
            <p className="text-muted-foreground">
              Your reactivation request is pending. An administrator will review it and email you when a decision is made.
            </p>
          ) : (
            <>
              <p>Confirm below to request that an administrator reactivate your account. This does not restore access immediately.</p>
              <Button
                className="w-full"
                disabled={submit.isPending}
                onClick={() => submit.mutate()}
              >
                Request reactivation
              </Button>
            </>
          )}
          <Button asChild variant="ghost" className="w-full">
            <Link to="/">Return home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReactivationRequest;
