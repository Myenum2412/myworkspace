import { Suspense } from "react";
import ProjectsInteractive from "./projects-interactive";

export default function ClientProjectsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ProjectsInteractive />
    </Suspense>
  );
}
