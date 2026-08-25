import { BarChart3, CheckCircle, Clock, FolderOpen, Layers, Shield, Users } from "@/lib/icons";

export function FeaturePlatform() {
  return (
    <section className="py-32 px-6 bg-slate-50 min-h-screen w-full">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-3 flex flex-col justify-start">
          <h2 className="text-4xl font-bold text-slate-900 leading-tight text-balance">
            Everything <br /> you need
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed text-pretty pt-4">
            MyWorkspace brings together tasks, teams, files, and clients in one powerful platform.
          </p>
        </div>

        <div className="relative overflow-hidden md:col-span-4 bg-white p-10 rounded-3xl border border-slate-200 flex flex-col justify-between h-80">
          <img
            src="https://images.unsplash.com/photo-1763010156322-2fb80d48ea8b?q=80&w=1760&auto=format&fit=crop"
            alt=""
            className="absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-300 ease-out"
          />
          <div className="flex justify-between items-start relative z-2">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Task Management</h3>
            <CheckCircle className="size-8 text-slate-900" />
          </div>
          <p className="text-slate-900 text-sm leading-relaxed text-pretty relative z-2">
            Organize, assign, and track tasks with boards, timelines, and priority levels.
          </p>
        </div>

        <div className="md:col-span-5 bg-white p-10 rounded-3xl border border-slate-200 flex flex-col justify-between h-80">
          <div className="flex justify-between items-start">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Team Collaboration</h3>
            <Users className="size-8 text-slate-400" />
          </div>
          <p className="text-slate-700 text-sm leading-relaxed text-pretty">
            Real-time chat, audio and video calls, and shared workspaces to keep everyone connected.
          </p>
        </div>

        <div className="md:col-span-4 bg-white p-10 rounded-3xl border border-slate-200 flex flex-col justify-between h-80">
          <div className="flex justify-between items-start">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">File Management</h3>
            <FolderOpen className="size-8 text-slate-400" />
          </div>
          <p className="text-slate-700 text-sm leading-relaxed text-pretty">
            Upload, preview, and organize files in secure folders with version control and sharing.
          </p>
        </div>

        <div className="md:col-span-4 bg-white p-10 rounded-3xl border border-slate-200 flex flex-col justify-between h-80">
          <div className="flex justify-between items-start">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Time Tracking</h3>
            <Clock className="size-8 text-slate-400" />
          </div>
          <p className="text-slate-700 text-sm leading-relaxed text-pretty">
            Track billable hours, manage timesheets, and generate time reports for your team.
          </p>
        </div>

        <div className="md:col-span-4 bg-blue-500 p-10 rounded-3xl flex flex-col justify-between h-80 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <h3 className="text-xl font-bold text-white tracking-tight">Client Portal</h3>
            <Layers className="size-8 text-white" />
          </div>
          <div className="absolute inset-0 grid grid-cols-4 gap-2 opacity-10 p-4 pointer-events-none">
            {Array.from({ length: 16 }).map((_, i) => (
              <Shield key={i} className="size-6 text-white" />
            ))}
          </div>
          <div className="relative z-10 flex flex-col h-full justify-end">
            <p className="text-white/90 text-sm font-medium">
              Give your clients a dedicated, secure portal to track projects and files.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
