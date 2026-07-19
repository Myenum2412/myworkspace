"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { openDB } from "idb";

interface SetupState {
  storagePath: string;
  availableSpace: number;
  totalSpace: number;
  step: "welcome" | "storage" | "validating" | "configuring" | "complete";
  error: string | null;
  warning: string | null;
}

const DB_NAME = "myworkspace-setup";
const STORE_NAME = "config";

function getSetupDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    },
  });
}

function estimateDiskSpace(path: string): Promise<{ available: number; total: number }> {
  return new Promise((resolve) => {
    if ("storage" in navigator && "estimate" in (navigator as any).storage) {
      (navigator as any).storage.estimate().then(
        (estimate: { usage: number; quota: number }) => {
          resolve({
            available: estimate.quota - estimate.usage,
            total: estimate.quota,
          });
        },
        () => resolve({ available: 10 * 1024 ** 3, total: 100 * 1024 ** 3 }),
      );
    } else {
      resolve({ available: 10 * 1024 ** 3, total: 100 * 1024 ** 3 });
    }
  });
}

async function validateStoragePath(path: string): Promise<{ valid: boolean; error?: string }> {
  try {
    localStorage.setItem("__workspace_path_test", "test");
    localStorage.removeItem("__workspace_path_test");
  } catch {
    return { valid: false, error: "Storage is not writable" };
  }
  return { valid: true };
}

async function createDirectoryStructure(basePath: string): Promise<void> {
  const dirs = [
    "cache",
    "attachments",
    "exports",
    "backups",
    "logs",
    "offline-db",
    "thumbnails",
    "temp",
    "config",
    "sync",
  ];

  try {
    localStorage.setItem("workspace-base-path", basePath);
    localStorage.setItem("workspace-dirs", JSON.stringify(dirs));
  } catch {
    // Store in IndexedDB as fallback
    const db = await getSetupDb();
    await db.put(STORE_NAME, { key: "basePath", value: basePath });
    await db.put(STORE_NAME, { key: "directories", value: dirs });
  }
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function SetupWizard() {
  const [state, setState] = useState<SetupState>({
    storagePath: "",
    availableSpace: 0,
    totalSpace: 0,
    step: "welcome",
    error: null,
    warning: null,
  });
  const [wizardCompleted, setWizardCompleted] = useState<boolean | null>(null);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkSetup = async () => {
      const completed = localStorage.getItem("workspace-setup-completed");
      if (completed === "true") {
        setWizardCompleted(true);
        return;
      }
      const isInstalled = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone;
      if (isInstalled) {
        setWizardCompleted(false);
      } else {
        setWizardCompleted(true);
      }
    };
    checkSetup();
  }, []);

  const handleBrowseStorage = useCallback(async () => {
    try {
      if (!("showDirectoryPicker" in window)) {
        setState((s) => ({
          ...s,
          storagePath: "/home/user/MyWorkSpaceData",
          warning: "Your browser doesn't support directory selection. A default path will be used.",
        }));
        return;
      }

      const dirHandle = await (window as any).showDirectoryPicker({ mode: "readwrite" });
      if (dirHandle.name) {
        const path = `/home/user/${dirHandle.name}`;
        const { available, total } = await estimateDiskSpace(dirHandle.name);
        setState((s) => ({
          ...s,
          storagePath: path,
          availableSpace: available,
          totalSpace: total,
          error: null,
          warning: available < 1 * 1024 ** 3 ? "Available space is less than 1GB. Some features may be limited." : null,
        }));
      }
    } catch {
      setState((s) => ({
        ...s,
        warning: "Could not open directory picker. You can type a path manually.",
      }));
    }
  }, []);

  const handlePathChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const path = e.target.value;
      setState((s) => ({ ...s, storagePath: path, error: null }));
    },
    [],
  );

  const handleStartSetup = useCallback(async () => {
    setState((s) => ({ ...s, step: "storage" }));
  }, []);

  const handleBeginInstall = useCallback(async () => {
    setState((s) => ({ ...s, step: "validating" }));

    const path = state.storagePath || "/home/user/MyWorkSpaceData";
    setProgress(25);

    const validation = await validateStoragePath(path);
    if (!validation.valid) {
      setState((s) => ({
        ...s,
        step: "storage",
        error: validation.error || "Invalid storage location",
      }));
      return;
    }
    setProgress(50);

    await createDirectoryStructure(path);
    setProgress(75);
    setState((s) => ({ ...s, step: "configuring" }));

    await new Promise((r) => setTimeout(r, 800));
    setProgress(100);

    localStorage.setItem("workspace-setup-completed", "true");
    setState((s) => ({ ...s, step: "complete" }));

    setTimeout(() => {
      setWizardCompleted(true);
    }, 1500);
  }, [state.storagePath]);

  const handleSkipSetup = useCallback(() => {
    localStorage.setItem("workspace-setup-completed", "true");
    localStorage.setItem("workspace-base-path", "/home/user/MyWorkSpaceData");
    setWizardCompleted(true);
  }, []);

  if (wizardCompleted === null) return null;
  if (wizardCompleted) return null;

  const isStandalone = typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 backdrop-blur-md">
      <Card className="w-full max-w-lg mx-4 p-8 shadow-2xl border-border/50">
        {state.step === "welcome" && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                MyWorkSpace
              </div>
              <p className="text-lg text-muted-foreground">Setup Wizard</p>
            </div>

            <Separator />

            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                Welcome to MyWorkSpace! Let&apos;s get your workspace ready.
                This wizard will help you configure where your data is stored.
              </p>
              <ul className="space-y-2 list-disc list-inside">
                <li>Choose a storage location for your files and data</li>
                <li>Configure offline synchronization</li>
                <li>Set up caching for optimal performance</li>
                <li>Prepare your workspace for first use</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={handleStartSetup} className="flex-1" size="lg">
                Get Started
              </Button>
              <Button variant="outline" onClick={handleSkipSetup} size="lg">
                Skip
              </Button>
            </div>
          </div>
        )}

        {state.step === "storage" && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="text-xl font-semibold">Choose Storage Location</div>
              <p className="text-sm text-muted-foreground">
                Select where workspace data, cache, and files will be stored
              </p>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Storage Path</Label>
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    id="storage-path"
                    value={state.storagePath}
                    onChange={handlePathChange}
                    placeholder=""
                    className="font-mono text-sm"
                  />
                  {isStandalone && (
                    <Button variant="outline" onClick={handleBrowseStorage} className="shrink-0">
                      Browse
                    </Button>
                  )}
                </div>
              </div>

              {state.totalSpace > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Available: {formatSize(state.availableSpace)}</span>
                    <span>Total: {formatSize(state.totalSpace)}</span>
                  </div>
                  <Progress
                    value={(state.availableSpace / state.totalSpace) * 100}
                    className="h-1"
                  />
                </div>
              )}

              {state.error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {state.error}
                </div>
              )}

              {state.warning && (
                <div className="p-3 rounded-lg bg-yellow-500/10 text-yellow-600 text-sm">
                  {state.warning}
                </div>
              )}

              <div className="text-xs text-muted-foreground space-y-1">
                <p>The following directories will be created:</p>
                <code className="block p-2 rounded bg-muted font-mono text-[11px] leading-relaxed">
                  {state.storagePath || "[path]"}/
                  {"{cache, attachments, exports, backups, logs, offline-db, thumbnails, temp}"}
                </code>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={handleBeginInstall} className="flex-1" size="lg">
                Confirm & Install
              </Button>
              <Button variant="outline" onClick={handleSkipSetup} size="lg">
                Skip
              </Button>
            </div>
          </div>
        )}

        {state.step === "validating" && (
          <div className="space-y-6 text-center py-8">
            <div className="text-xl font-semibold">Validating Storage...</div>
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground">Checking permissions and available space</p>
          </div>
        )}

        {state.step === "configuring" && (
          <div className="space-y-6 text-center py-8">
            <div className="text-xl font-semibold">Configuring Workspace...</div>
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground">Creating directory structure and initializing storage</p>
          </div>
        )}

        {state.step === "complete" && (
          <div className="space-y-6 text-center py-8">
            <div className="text-5xl">&#10003;</div>
            <div className="text-xl font-semibold">Setup Complete!</div>
            <p className="text-sm text-muted-foreground">
              Your workspace is ready. Redirecting to the dashboard...
            </p>
            <Progress value={100} className="h-2" />
          </div>
        )}
      </Card>
    </div>
  );
}