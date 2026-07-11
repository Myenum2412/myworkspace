"use client"
import React, { useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CameraIcon, XIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Row {
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface FirstSlideEmployeeForm {
  displayId: string;
  firstName: string;
  lastName: string;
  nickname: string;
  email: string;
  password?: string;
  department: string;
  location: string;
  designation: string;
  roleName: string;
  employmentType: string;
  status: string;
  branchName: string;
  shift: string;
  sourceOfHire: string;
  joiningDate: string;
  currentExperience: string;
  totalExperience: string;
  avatar?: string;
  phone: string;
  alternateEmail: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
}

export function ProfileImageUpload({ avatar, onAvatarChange }: { avatar?: string; onAvatarChange: (url: string) => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentImage = preview || avatar;

  const uploadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;

    // Local preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Upload to server
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("banner", file);
      const res = await fetch("/api/user/banner", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (data.bannerUrl) {
        onAvatarChange(data.bannerUrl);
      }
    } catch {
      // keep preview on failure
    } finally {
      setUploading(false);
    }
  }, [onAvatarChange]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const removeImage = () => {
    setPreview(null);
    onAvatarChange("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`relative size-28 rounded-full flex items-center justify-center border-2 transition-colors cursor-pointer overflow-hidden ${
          dragOver ? "border-primary bg-primary/5" : "border-border bg-muted"
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {currentImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentImage} alt="Avatar" className="size-full rounded-full object-cover" />
        ) : (
          <CameraIcon className="size-8 text-muted-foreground" />
        )}

        {uploading && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center rounded-full">
            <Loader2Icon className="size-6 animate-spin text-primary" />
          </div>
        )}

        {currentImage && !uploading && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeImage(); }}
            className="absolute top-0 right-0 size-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow hover:bg-destructive/80 transition-colors"
          >
            <XIcon className="size-3" />
          </button>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? <Loader2Icon className="size-3 animate-spin mr-1 round-6xl" /> : null}
        {currentImage ? "Change Photo" : "Upload Photo"}
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <p className="text-[10px] text-muted-foreground text-center">
        Drag & drop or click to upload
      </p>
    </div>
  );
}

interface SectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formData: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (key: any, value: string) => void;
  options?: Record<string, string[]>;
}

export function BasicInfoSection({ formData, onChange, options }: SectionProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field>
        <FieldLabel>Employee ID</FieldLabel>
        <Input
          value={formData.displayId}
          onChange={(e) => onChange("displayId", e.target.value)}
          placeholder=""
        />
      </Field>
      <Field>
        <FieldLabel>Nickname</FieldLabel>
        <Input
          value={formData.nickname}
          onChange={(e) => onChange("nickname", e.target.value)}
          placeholder=""
        />
      </Field>
      <Field>
        <FieldLabel>First Name</FieldLabel>
        <Input
          value={formData.firstName}
          onChange={(e) => onChange("firstName", e.target.value)}
          placeholder=""
        />
      </Field>
      <Field>
        <FieldLabel>Last Name</FieldLabel>
        <Input
          value={formData.lastName}
          onChange={(e) => onChange("lastName", e.target.value)}
          placeholder=""
        />
      </Field>
      <Field>
        <FieldLabel>Email</FieldLabel>
        <Input
          type="email"
          value={formData.email}
          onChange={(e) => onChange("email", e.target.value)}
          placeholder=""
        />
      </Field>
      <Field>
        <FieldLabel>Password</FieldLabel>
        <Input
          type="password"
          value={formData.password || ""}
          onChange={(e) => onChange("password", e.target.value)}
          placeholder=""
        />
      </Field>
      <Field>
        <FieldLabel>Department</FieldLabel>
        <Select value={formData.department} onValueChange={(v) => onChange("department", v)}>
          <SelectTrigger>
            <SelectValue placeholder="" />
          </SelectTrigger>
          <SelectContent>
            {(options?.departments || []).map((opt: string) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel>Location</FieldLabel>
        <Select value={formData.location} onValueChange={(v) => onChange("location", v)}>
          <SelectTrigger>
            <SelectValue placeholder="" />
          </SelectTrigger>
          <SelectContent>
            {(options?.locations || []).map((opt: string) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

export function WorkInfoSection({ formData, onChange, options }: SectionProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field>
        <FieldLabel>Designation</FieldLabel>
        <Select value={formData.designation} onValueChange={(v) => onChange("designation", v)}>
          <SelectTrigger>
            <SelectValue placeholder="" />
          </SelectTrigger>
          <SelectContent>
            {(options?.designations || []).map((opt: string) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel>Employment Type</FieldLabel>
        <Select value={formData.employmentType} onValueChange={(v) => onChange("employmentType", v)}>
          <SelectTrigger>
            <SelectValue placeholder="" />
          </SelectTrigger>
          <SelectContent>
            {(options?.employmentTypes || []).map((opt: string) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel>Status</FieldLabel>
        <Select value={formData.status} onValueChange={(v) => onChange("status", v)}>
          <SelectTrigger>
            <SelectValue placeholder="" />
          </SelectTrigger>
          <SelectContent>
            {(options?.statuses || []).map((opt: string) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel>Branch</FieldLabel>
        <Select value={formData.branchName} onValueChange={(v) => onChange("branchName", v)}>
          <SelectTrigger>
            <SelectValue placeholder="" />
          </SelectTrigger>
          <SelectContent>
            {(options?.branches || []).map((opt: string) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel>Shift</FieldLabel>
        <Select value={formData.shift} onValueChange={(v) => onChange("shift", v)}>
          <SelectTrigger>
            <SelectValue placeholder="" />
          </SelectTrigger>
          <SelectContent>
            {(options?.shifts || []).map((opt: string) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel>Source of Hire</FieldLabel>
        <Select value={formData.sourceOfHire} onValueChange={(v) => onChange("sourceOfHire", v)}>
          <SelectTrigger>
            <SelectValue placeholder="" />
          </SelectTrigger>
          <SelectContent>
            {(options?.sourceOfHires || []).map((opt: string) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel>Joining Date</FieldLabel>
        <Input
          type="date"
          value={formData.joiningDate}
          onChange={(e) => onChange("joiningDate", e.target.value)}
        />
      </Field>
      <Field>
        <FieldLabel>Current Experience</FieldLabel>
        <Input
          value={formData.currentExperience}
          onChange={(e) => onChange("currentExperience", e.target.value)}
          placeholder=""
        />
      </Field>
      <Field>
        <FieldLabel>Total Experience</FieldLabel>
        <Input
          value={formData.totalExperience}
          onChange={(e) => onChange("totalExperience", e.target.value)}
          placeholder=""
        />
      </Field>
    </div>
  );
}

export function ContactDetailsSection({ formData, onChange, options }: SectionProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field>
        <FieldLabel>Phone</FieldLabel>
        <PhoneInput value={formData.phone} onChange={(value) => onChange("phone", value)} placeholder="" />
      </Field>
      <Field>
        <FieldLabel>Alternate Email</FieldLabel>
        <Input
          type="email"
          value={formData.alternateEmail}
          onChange={(e) => onChange("alternateEmail", e.target.value)}
          placeholder=""
        />
      </Field>
      <Field className="sm:col-span-2">
        <FieldLabel>Address</FieldLabel>
        <Input
          value={formData.address}
          onChange={(e) => onChange("address", e.target.value)}
          placeholder=""
        />
      </Field>
      <Field>
        <FieldLabel>City</FieldLabel>
        <Input
          value={formData.city}
          onChange={(e) => onChange("city", e.target.value)}
          placeholder=""
        />
      </Field>
      <Field>
        <FieldLabel>State</FieldLabel>
        <Input
          value={formData.state}
          onChange={(e) => onChange("state", e.target.value)}
          placeholder=""
        />
      </Field>
      <Field>
        <FieldLabel>Country</FieldLabel>
        <Select value={formData.country} onValueChange={(v) => onChange("country", v)}>
          <SelectTrigger>
            <SelectValue placeholder="" />
          </SelectTrigger>
          <SelectContent>
            {(options?.countries || []).map((opt: string) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel>Zip Code</FieldLabel>
        <Input
          value={formData.zipCode}
          onChange={(e) => onChange("zipCode", e.target.value)}
          placeholder=""
        />
      </Field>
    </div>
  );
}

interface DynamicRowSectionProps {
  title: string;
  rows: Row[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  renderRow: (row: Row, index: number) => React.ReactNode;
}

export function DynamicRowSection({ title, rows, onAdd, onRemove, renderRow }: DynamicRowSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-medium text-lg">{title}</h3>
      {rows.map((row, index) => (
        <div key={row.id} className="relative border rounded-md p-4 bg-muted/20">
          <button
            type="button"
            onClick={() => onRemove(row.id)}
            className="absolute top-2 right-2 text-destructive text-sm"
          >
            Remove
          </button>
          {renderRow(row, index)}
        </div>
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="text-sm text-primary font-medium"
      >
        + Add Another
      </button>
    </div>
  );
}

interface SelectWithAddProps {
  label: string;
  options: string[];
  value?: string;
  onChange?: (value: string) => void;
}

export function SelectWithAdd({ label, options, value, onChange }: SelectWithAddProps) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <select
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm md:text-sm"
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
      >
        <option value="">Select...</option>
        {options?.map((opt: string) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </Field>
  );
}
