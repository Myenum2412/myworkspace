"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  MailIcon,
  CalendarIcon,
  ShieldIcon,
  Building2Icon,
  GlobeIcon,
  CreditCardIcon,
  UsersIcon,
  CircleIcon,
  CameraIcon,
  XIcon,
  Loader2Icon,
  UserIcon,
} from "lucide-react";

import nextDynamic from "next/dynamic";
const BannerUpload = nextDynamic(
  () => import("@/components/ui/file-upload-1").then((m) => m.BannerUpload),
  { ssr: false }
);
const ProfileImageUpload = nextDynamic(
  () => import("@/components/ui/profile-image-upload").then((m) => m.ProfileImageUpload),
  { ssr: false }
);

export const dynamic = "force-dynamic";

const planLabels: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

const statusColors: Record<string, string> = {
  online: "bg-emerald-500",
  offline: "bg-gray-400",
  break: "bg-amber-500",
};

const roleBadge: Record<string, "default" | "secondary" | "outline"> = {
  admin: "default",
  manager: "secondary",
  member: "outline",
};

type ProfileData = {
  user: {
    id: string;
    name: string;
    email: string;
    status: string;
    role: string;
    createdAt: string;
    bannerUrl?: string;
    image?: string;
  } | null;
  org: {
    id: string;
    name: string;
    domain?: string;
    plan: string;
    createdAt: string;
  } | null;
  memberCount: number;
};

const FAKE_PROFILE: ProfileData = {
  user: { id: "u1", name: "Demo User", email: "demo@company.com", status: "online", role: "admin", createdAt: "2024-01-15T00:00:00Z", bannerUrl: "", image: "" },
  org: { id: "o1", name: "Demo Corp", domain: "demo.com", plan: "pro", createdAt: "2023-06-01T00:00:00Z" },
  memberCount: 12,
};

export default function ProfilePage() {
  const { data: session } = useSession();
  const [data, setData] = useState<ProfileData | null>(null);
  const [showBannerEditor, setShowBannerEditor] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [bannerUrl, setBannerUrl] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [fileKey, setFileKey] = useState(0);
  const [imageFileKey, setImageFileKey] = useState(0);

  useEffect(() => {
    fetch("/api/user/profile", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const result = d.data || d;
        setData(result);
        setBannerUrl(result?.user?.bannerUrl || "");
        setProfileImage(result?.user?.image || "");
      })
      .catch(() => setData(FAKE_PROFILE));
  }, []);

  const dbUser = data?.user;
  const org = data?.org;
  const memberCount = data?.memberCount ?? 0;

  const user = {
    name: session?.user?.name || dbUser?.name || "User",
    email: session?.user?.email || dbUser?.email || "user@example.com",
    avatar: profileImage || session?.user?.image || dbUser?.image || "",
  };

  async function updateBanner(url: string) {
    const res = await fetch("/api/user/banner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ url }),
    });
    if (res.ok) {
      const result = await res.json();
      setBannerUrl(result.bannerUrl);
      setShowBannerEditor(false);
      setUrlInput("");
    }
  }

  async function handleBannerFile(file: File) {
    setUploading(true);
    const formData = new FormData();
    formData.append("banner", file);
    const res = await fetch("/api/user/banner", {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    if (res.ok) {
      const result = await res.json();
      setBannerUrl(result.bannerUrl);
      setShowBannerEditor(false);
      setFileKey((k) => k + 1);
    }
    setUploading(false);
  }

  async function updateProfileImage(url: string) {
    const res = await fetch("/api/user/profile-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ url }),
    });
    if (res.ok) {
      const result = await res.json();
      setProfileImage(result.image);
      setShowImageEditor(false);
      setImageUrlInput("");
    }
  }

  async function handleProfileImageFile(file: File) {
    setUploadingImage(true);
    const formData = new FormData();
    formData.append("image", file);
    const res = await fetch("/api/user/profile-image", {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    if (res.ok) {
      const result = await res.json();
      setProfileImage(result.image);
      setShowImageEditor(false);
      setImageFileKey((k) => k + 1);
    }
    setUploadingImage(false);
  }

  if (!data) {
    return (
      <SidebarProvider>
        <AppSidebar user={user} />
        <SidebarInset>
          <Header />
          <main className="flex flex-1 flex-col items-center justify-center py-24">
            <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
          </main>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <Header />
        <main className="flex flex-1 flex-col">
          <div
            className="relative h-[200px] bg-gradient-to-b from-primary/90 via-primary/40 to-background bg-cover bg-center"
            style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined}
          >
            <button
              onClick={() => setShowBannerEditor(true)}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-md bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm hover:bg-background/90 transition-colors"
            >
              <CameraIcon className="size-3.5" />
              Edit banner
            </button>
          </div>

          <div className="flex flex-col items-center -mt-12 px-6">
            <div className="relative group">
              <Avatar className="size-24 ring-4 ring-background shadow-xl">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="text-2xl">{user.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <button
                onClick={() => setShowImageEditor(true)}
                className="absolute -bottom-1 -right-1 flex items-center justify-center size-8 rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-colors"
                aria-label="Edit profile photo"
              >
                <CameraIcon className="size-4" />
              </button>
            </div>

            <h1 className="mt-3 text-2xl font-bold">{user.name}</h1>
            <div className="flex items-center gap-2 mt-1 text-muted-foreground">
              <span className="flex items-center gap-1.5 text-sm">
                <span className={`inline-block size-2 rounded-full ${statusColors[dbUser?.status || "offline"]}`} />
                {dbUser?.status ? dbUser.status.charAt(0).toUpperCase() + dbUser.status.slice(1) : "Offline"}
              </span>
              <span aria-hidden>&middot;</span>
              <Badge variant={roleBadge[dbUser?.role || "member"]}>
                {dbUser?.role ? dbUser.role.charAt(0).toUpperCase() + dbUser.role.slice(1) : "Member"}
              </Badge>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 p-6 max-w-4xl mx-auto w-full">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserIcon className="size-5" />
                  User Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <MailIcon className="size-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{user.email}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-3">
                  <ShieldIcon className="size-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Role</p>
                    <p className="text-sm font-medium capitalize">{dbUser?.role || "Member"}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-3">
                  <CircleIcon className="size-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="text-sm font-medium capitalize">{dbUser?.status || "Offline"}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-3">
                  <CalendarIcon className="size-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Member since</p>
                    <p className="text-sm font-medium">
                      {dbUser?.createdAt
                        ? new Date(dbUser.createdAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })
                        : "—"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2Icon className="size-5" />
                  Company Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {org ? (
                  <>
                    <div className="flex items-center gap-3">
                      <Building2Icon className="size-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm text-muted-foreground">Company name</p>
                        <p className="text-sm font-medium">{org.name}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center gap-3">
                      <GlobeIcon className="size-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm text-muted-foreground">Domain</p>
                        <p className="text-sm font-medium">{org.domain || "—"}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center gap-3">
                      <CreditCardIcon className="size-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm text-muted-foreground">Plan</p>
                        <p className="text-sm font-medium">{planLabels[org.plan || "starter"] || org.plan}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center gap-3">
                      <UsersIcon className="size-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm text-muted-foreground">Team size</p>
                        <p className="text-sm font-medium">{memberCount} member{memberCount !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center gap-3">
                      <CalendarIcon className="size-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm text-muted-foreground">Created</p>
                        <p className="text-sm font-medium">
                          {org.createdAt
                            ? new Date(org.createdAt).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No organization found.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </main>

        {/* Banner editor modal */}
        {showBannerEditor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowBannerEditor(false)}>
            <div className="w-full max-w-xs rounded-xl bg-background p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold">Update banner</h2>
                <button
                  onClick={() => setShowBannerEditor(false)}
                  className="rounded-md p-1 hover:bg-muted transition-colors"
                >
                  <XIcon className="size-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Paste image URL"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Button
                    size="sm"
                    className="h-8 text-xs shrink-0"
                    disabled={!urlInput}
                    onClick={() => updateBanner(urlInput)}
                  >
                    Set
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <span className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">or</span>
                  </span>
                </div>

                <BannerUpload
                  key={fileKey}
                  onFile={handleBannerFile}
                  disabled={uploading}
                />

                {bannerUrl && (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <span className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">or</span>
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      className="w-full h-8 text-xs text-destructive hover:text-destructive"
                      onClick={() => updateBanner("")}
                    >
                      Remove banner
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Profile image editor modal */}
        {showImageEditor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowImageEditor(false)}>
            <div className="w-full max-w-xs rounded-xl bg-background p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold">Update profile photo</h2>
                <button
                  onClick={() => setShowImageEditor(false)}
                  className="rounded-md p-1 hover:bg-muted transition-colors"
                >
                  <XIcon className="size-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Paste image URL"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Button
                    size="sm"
                    className="h-8 text-xs shrink-0"
                    disabled={!imageUrlInput}
                    onClick={() => updateProfileImage(imageUrlInput)}
                  >
                    Set
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <span className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">or</span>
                  </span>
                </div>

                <ProfileImageUpload
                  key={imageFileKey}
                  onFile={handleProfileImageFile}
                  disabled={uploadingImage}
                />

                {profileImage && (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <span className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">or</span>
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      className="w-full h-8 text-xs text-destructive hover:text-destructive"
                      onClick={() => updateProfileImage("")}
                    >
                      Remove photo
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
