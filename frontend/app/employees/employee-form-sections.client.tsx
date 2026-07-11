"use client"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PhoneInput } from "@/components/ui/phone-input"
import {
  Field,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Camera, ChevronDown, ChevronRight, Eye, EyeOff } from "lucide-react"
import { getDropdownOptions } from "@/lib/dropdown-options"

export interface FirstSlideEmployeeForm {
  displayId: string
  firstName: string
  lastName: string
  nickname: string
  email: string
  password: string
  department: string
  location: string
  designation: string
  roleName: string
  employmentType: string
  status: string
  branchName: string
  shift: string
  sourceOfHire: string
  joiningDate: string
  currentExperience: string
  totalExperience: string
  avatar?: string
  phone?: string
  secondaryPhone?: string
  address?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  linkedin?: string
  github?: string
  twitter?: string
  portfolio?: string
  exitDate?: string
}

export interface Row {
  id: string
  [key: string]: any
}

interface ProfileImageUploadProps {
  avatar?: string
  onAvatarChange: (url: string) => void
}

export function ProfileImageUpload({ avatar, onAvatarChange }: ProfileImageUploadProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        onAvatarChange(reader.result as string)
        e.target.value = ""
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className="size-24 rounded-full overflow-hidden ring-2 ring-background flex items-center justify-center bg-muted">
          {avatar ? (
            <img src={avatar} alt="Profile" className="size-full object-cover" />
          ) : (
            <Camera className="size-8 text-muted-foreground/50" />
          )}
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="absolute bottom-0 right-0 rounded-full bg-primary p-2.5 sm:p-2 text-primary-foreground hover:bg-primary/90"
          aria-label="Upload photo"
        >
          <Camera className="h-4 w-4" />
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <p className="text-sm text-muted-foreground">Upload Photo</p>
    </div>
  )
}

interface BasicInfoSectionProps {
  formData: FirstSlideEmployeeForm
  onChange: (field: keyof FirstSlideEmployeeForm, value: string) => void
  options?: Record<string, string[]>
}

export function BasicInfoSection({ formData, onChange, options }: BasicInfoSectionProps) {
  const [showPassword, setShowPassword] = React.useState(false)
  return (
    <FieldSet>
      <h1 className="text-lg sm:text-xl font-semibold mb-4">Create Employee Account</h1>
      <FieldLegend>Basic Information</FieldLegend>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel>Display ID</FieldLabel>
          <Input
            placeholder=""
            value={formData.displayId}
            onChange={(e) => onChange("displayId", e.target.value)}
            readOnly
          />
        </Field>
        <Field>
          <FieldLabel>First Name *</FieldLabel>
          <Input
            placeholder=""
            value={formData.firstName}
            onChange={(e) => onChange("firstName", e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel>Last Name *</FieldLabel>
          <Input
            placeholder=""
            value={formData.lastName}
            onChange={(e) => onChange("lastName", e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel>Nickname</FieldLabel>
          <Input
            placeholder=""
            value={formData.nickname}
            onChange={(e) => onChange("nickname", e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel>Email *</FieldLabel>
          <Input
            type="email"
            placeholder=""
            value={formData.email}
            onChange={(e) => onChange("email", e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel>Password</FieldLabel>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder=""
              value={formData.password}
              onChange={(e) => onChange("password", e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
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
    </FieldSet>
  )
}

interface WorkInfoSectionProps {
  formData: FirstSlideEmployeeForm
  onChange: (field: keyof FirstSlideEmployeeForm, value: string) => void
  options?: Record<string, string[]>
}

export function WorkInfoSection({ formData, onChange, options }: WorkInfoSectionProps) {
  return (
    <div className="space-y-6">
      <FieldSet>
        <FieldLegend>Work Information</FieldLegend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <FieldLabel>Role Name</FieldLabel>
            <Select value={formData.roleName || "member"} onValueChange={(v) => onChange("roleName", v)}>
              <SelectTrigger>
                <SelectValue placeholder="" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
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
        </div>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Joining Details</FieldLegend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Branch Name</FieldLabel>
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
            <FieldLabel>Date of Joining</FieldLabel>
            <Input
              type="date"
              value={formData.joiningDate}
              onChange={(e) => onChange("joiningDate", e.target.value)}
            />
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
        </div>
      </FieldSet>
    </div>
  )
}

export function ContactDetailsSection({
  phone = "",
  secondaryPhone = "",
  address = "",
  city = "",
  state = "",
  postalCode = "",
  country = "",
  onPhoneChange,
  onSecondaryPhoneChange,
  onAddressChange,
  onCityChange,
  onStateChange,
  onPostalCodeChange,
  onCountryChange,
  options,
}: {
  phone?: string
  secondaryPhone?: string
  address?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  onPhoneChange?: (value: string) => void
  onSecondaryPhoneChange?: (value: string) => void
  onAddressChange?: (value: string) => void
  onCityChange?: (value: string) => void
  onStateChange?: (value: string) => void
  onPostalCodeChange?: (value: string) => void
  onCountryChange?: (value: string) => void
  options?: Record<string, string[]>
} = {}) {
  return (
    <FieldSet>
      <FieldLegend>Contact Details</FieldLegend>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel>Phone Number</FieldLabel>
          <PhoneInput value={phone} onChange={(value) => onPhoneChange?.(value)} placeholder="" />
        </Field>
        <Field>
          <FieldLabel>Secondary Phone</FieldLabel>
          <PhoneInput value={secondaryPhone} onChange={(value) => onSecondaryPhoneChange?.(value)} placeholder="" />
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel>Address</FieldLabel>
          <Input 
            placeholder=""
            value={address}
            onChange={(e) => onAddressChange?.(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel>City</FieldLabel>
          <Input 
            placeholder=""
            value={city}
            onChange={(e) => onCityChange?.(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel>State/Province</FieldLabel>
          <Input 
            placeholder=""
            value={state}
            onChange={(e) => onStateChange?.(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel>Postal Code</FieldLabel>
          <Input 
            placeholder=""
            value={postalCode}
            onChange={(e) => onPostalCodeChange?.(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel>Country</FieldLabel>
          <Select value={country} onValueChange={(v) => onCountryChange?.(v)}>
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
      </div>
    </FieldSet>
  )
}

interface DynamicRowSectionProps {
  title: string
  rows: Row[]
  onAdd: () => void
  onRemove: (id: string) => void
  renderRow: (row: Row) => React.ReactNode
}

export function DynamicRowSection({ title, rows, onAdd, onRemove, renderRow }: DynamicRowSectionProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  return (
    <FieldSet>
      <div className="flex items-center justify-between mb-6">
        <FieldLegend>{title}</FieldLegend>
        <div className="flex items-center gap-2">
          <Button onClick={onAdd} variant="outline" size="sm" className="touch-target">
            + Add {title}
          </Button>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {isOpen ? <ChevronDown className="size-5" /> : <ChevronRight className="size-5" />}
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="space-y-6">
          {rows.map((row) => (
            <div key={row.id} className="relative border rounded-lg p-4">
              <div className="pt-8 sm:pt-0">
                {renderRow(row)}
              </div>
              {rows.length > 1 && (
                <Button
                  onClick={() => onRemove(row.id)}
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 text-destructive hover:text-destructive touch-target"
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </FieldSet>
  )
}

interface SelectWithAddProps {
  label: string
  options: string[]
  value?: string
  onChange?: (value: string) => void
}

export function SelectWithAdd({ label, options, value, onChange }: SelectWithAddProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [customValue, setCustomValue] = React.useState("")

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex gap-2">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="" />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setIsOpen(true)} variant="outline" size="sm">
          +
        </Button>
      </div>
      {isOpen && (
        <div className="mt-2 flex gap-2">
          <Input
            placeholder=""
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
          />
          <Button
            onClick={() => {
              setCustomValue("")
              setIsOpen(false)
            }}
            size="sm"
          >
            Add
          </Button>
        </div>
      )}
    </Field>
  )
}
