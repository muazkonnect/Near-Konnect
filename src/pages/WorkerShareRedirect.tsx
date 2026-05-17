import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { isValidWorkerUid, normalizeWorkerUid } from "@/lib/workerUid";
import AppLayout from "@/components/AppLayout";

const WorkerShareRedirect = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      if (!id) {
        navigate("/discover", { replace: true });
        return;
      }
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUuid) {
        navigate(`/worker/${id}`, { replace: true });
        return;
      }
      const uid = normalizeWorkerUid(id);
      if (!isValidWorkerUid(uid)) {
        navigate("/discover", { replace: true });
        return;
      }
      const { data } = await (supabase as any)
        .from("workers")
        .select("id")
        .eq("uid", uid)
        .maybeSingle();
      if (data?.id) {
        navigate(`/worker/${data.id}`, { replace: true });
      } else {
        navigate("/discover", { replace: true });
      }
    };
    void run();
  }, [id, navigate]);

  return (
    <AppLayout hideMobileHeader>
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    </AppLayout>
  );
};

export default WorkerShareRedirect;
