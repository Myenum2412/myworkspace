"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import {
  CameraIcon,
  UploadIcon,
  Loader2Icon,
  QrCodeIcon,
  CheckCircle2Icon,
  XCircleIcon,
} from "lucide-react";

export function GalleryAccessClient({
  token,
  galleryId,
  galleryName,
}: {
  token: string;
  galleryId: string;
  galleryName: string;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"form" | "camera" | "processing" | "result">("form");
  const [form, setForm] = useState({ fullName: "", email: "", phone: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selfie, setSelfie] = useState<string | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; sessionToken?: string; message?: string } | null>(null);

  function validateForm() {
    const errs: Record<string, string> = {};
    if (!form.fullName.trim()) errs.fullName = "Full name is required";
    if (!form.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Invalid email format";
    if (!form.phone.trim()) errs.phone = "Phone number is required";
    else if (!/^\+?[\d\s\-()]{7,20}$/.test(form.phone)) errs.phone = "Invalid phone number";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;
    setStep("camera");
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setCameraActive(false);
    }
  }

  function captureSelfie() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg");
    setSelfie(dataUrl);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
        setSelfieFile(file);
      }
    }, "image/jpeg");

    const stream = video.srcObject as MediaStream;
    stream?.getTracks().forEach((t) => t.stop());
    setCameraActive(false);
  }

  function handleSelfieUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelfieFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setSelfie(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  function retakeSelfie() {
    setSelfie(null);
    setSelfieFile(null);
    setCameraActive(false);
  }

  async function handleSubmit() {
    if (!selfieFile) return;
    setProcessing(true);
    setStep("processing");

    try {
      const formData = new FormData();
      formData.append("token", token);
      formData.append("galleryId", galleryId);
      formData.append("fullName", form.fullName);
      formData.append("email", form.email);
      formData.append("phone", form.phone);
      formData.append("selfie", selfieFile);

      const res = await fetch("/api/gallery/verify", { method: "POST", body: formData });
      const data = await res.json();

      if (data.success && data.sessionToken) {
        setResult({ success: true, sessionToken: data.sessionToken });
        setStep("result");
        setTimeout(() => {
          router.push(`/gallery/view?session=${data.sessionToken}`);
        }, 1500);
      } else {
        setResult({ success: false, message: data.message || "No matching photos were found." });
        setStep("result");
      }
    } catch {
      setResult({ success: false, message: "An error occurred. Please try again." });
      setStep("result");
    } finally {
      setProcessing(false);
    }
  }

  if (step === "processing") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-950 dark:to-gray-900 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <Loader2Icon className="size-12 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-lg font-semibold mb-1">Verifying Your Identity</h2>
            <p className="text-sm text-muted-foreground">Performing face recognition...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "result") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-950 dark:to-gray-900 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            {result?.success ? (
              <>
                <CheckCircle2Icon className="size-12 mx-auto mb-4 text-green-500" />
                <h2 className="text-lg font-semibold mb-1">Identity Verified!</h2>
                <p className="text-sm text-muted-foreground">Redirecting to your gallery...</p>
              </>
            ) : (
              <>
                <XCircleIcon className="size-12 mx-auto mb-4 text-amber-500" />
                <h2 className="text-lg font-semibold mb-1">No Match Found</h2>
                <p className="text-sm text-muted-foreground">{result?.message}</p>
                <Button className="mt-4" onClick={() => { setStep("form"); setResult(null); setSelfie(null); setSelfieFile(null); }}>
                  Try Again
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-950 dark:to-gray-900 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <QrCodeIcon className="size-8 text-primary" />
          </div>
          <CardTitle className="text-xl">{galleryName}</CardTitle>
          <CardDescription>Verify your identity to access the gallery</CardDescription>
        </CardHeader>
        <CardContent>
          {step === "form" && (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  placeholder=""
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                />
                {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder=""
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <PhoneInput
                  id="phone"
                  placeholder=""
                  value={form.phone}
                  onChange={(value) => setForm({ ...form, phone: value })}
                />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
              </div>

              <Button type="submit" className="w-full">
                Continue
              </Button>
            </form>
          )}

          {step === "camera" && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground mb-2">
                Please capture or upload a clear selfie for face verification.
              </div>

              {!selfie ? (
                <>
                  {!cameraActive ? (
                    <div className="flex flex-col gap-3">
                      <Button onClick={startCamera} className="w-full">
                        <CameraIcon className="size-4 mr-1" /> Use Camera
                      </Button>
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <Separator className="w-full" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">or</span>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                        <UploadIcon className="size-4 mr-1" /> Upload Photo
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleSelfieUpload}
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-muted">
                        <video ref={videoRef} className="size-full object-cover" playsInline />
                      </div>
                      <Button onClick={captureSelfie} className="w-full">
                        <CameraIcon className="size-4 mr-1" /> Capture
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-muted">
                    <img src={selfie} alt="Selfie preview" className="size-full object-cover" />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSubmit} className="flex-1" disabled={processing}>
                      {processing ? <Loader2Icon className="size-4 animate-spin mr-1" /> : <CheckCircle2Icon className="size-4 mr-1" />}
                      Submit & Verify
                    </Button>
                    <Button variant="outline" onClick={retakeSelfie}>Retake</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

function Separator({ className }: { className?: string }) {
  return <div className={`h-px bg-border ${className || ""}`} />;
}
