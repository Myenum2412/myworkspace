"use client";

import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";

interface FailedLogin {
  _id: string;
  email: string;
  ipAddress: string;
  userAgent: string;
  reason: string;
  createdAt: string;
}

interface RiskEvent {
  _id: string;
  userId: string;
  email: string;
  riskType: string;
  riskScore: number;
  action: string;
  createdAt: string;
}

export default function AdminSecurityPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Security Administration</h1>
        <p className="text-sm text-gray-500 mt-1">Security monitoring and audit logs</p>
      </div>
    </div>
  );
}
