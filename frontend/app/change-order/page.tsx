"use client";
import dynamic from "next/dynamic";

const ChangeOrderClient = dynamic(() => import("./change-order.client"), { ssr: false });

export default function ChangeOrderPageWrapper() {
  return <ChangeOrderClient />;
}
