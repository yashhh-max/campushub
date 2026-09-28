"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TpoRootPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/tpo/dashboard");
  }, [router]);
  return null;
}
