import Share from "../Share";
import React, { Suspense } from "react";
import { Toaster } from "react-hot-toast";
import { Dots_v3 } from "@/components/ui/dotsv3";

const page = () => {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Dots_v3 />
        </div>
      }
    >
      <Share />
      <Toaster />
    </Suspense>
  );
};

export default page;