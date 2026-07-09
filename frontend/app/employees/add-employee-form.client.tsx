"use client"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { CopyIcon, UploadIcon, FileTextIcon, XIcon, MailIcon, RefreshCwIcon, CheckCircleIcon, AlertCircleIcon } from "lucide-react"

import { getDropdownOptions } from "@/lib/dropdown-options"

import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { useAnalytics } from "@/hooks/use-analytics"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { employeeService } from "@/lib/services/employee-service"

import {
  ProfileImageUpload,
  BasicInfoSection,
  WorkInfoSection,
  ContactDetailsSection,
  DynamicRowSection,
  SelectWithAdd,
  type FirstSlideEmployeeForm,
  Row,
} from "./employee-form-sections"

/** Generate a short unique ID for dynamic rows. */
function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

interface AddEmployeeFormProps {
  onCancel?: () => void
  onEmployeeAdded?: (employee: Record<string, unknown>) => void
}

export function AddEmployeeForm({ onCancel, onEmployeeAdded }: AddEmployeeFormProps) {
  const { trackEvent } = useAnalytics("AddEmployeeForm")
  const queryClient = useQueryClient()
  const [savedEmployee, setSavedEmployee] = React.useState<Record<string, unknown> | null>(null)
  const [formError, setFormError] = React.useState("")
  const [dropdownOptions, setDropdownOptions] = React.useState<Record<string, string[]>>({})
  const [firstSlideData, setFirstSlideData] = React.useState<FirstSlideEmployeeForm>({
    displayId: "",
    firstName: "",
    lastName: "",
    nickname: "",
    email: "",
    password: "",
    department: "",
    location: "",
    designation: "",
    roleName: "",
    employmentType: "",
    status: "Active",
    branchName: "",
    shift: "",
    sourceOfHire: "",
    joiningDate: "",
    currentExperience: "",
    totalExperience: "",
  })

  React.useEffect(() => {
    setDropdownOptions(getDropdownOptions());
  }, [])

  const [workExperience, setWorkExperience] = React.useState<Row[]>([
    { id: "1", company: "", title: "", roles: "", from: "", to: "", description: "", relevant: false },
  ])
  const [educationDetails, setEducationDetails] = React.useState<Row[]>([
    { id: "1", institute: "", degree: "", specialization: "", completionDate: "" },
  ])
  const [dependentDetails, setDependentDetails] = React.useState<Row[]>([
    { id: "1", name: "", relationship: "", dob: "" },
  ])
  const [offerLetter, setOfferLetter] = React.useState<{ name: string; data: string } | null>(null)
  const [offerLetterUploading, setOfferLetterUploading] = React.useState(false)

  const updateWorkRow = (id: string, field: string, value: string | boolean) => {
    setWorkExperience((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  const updateRow = (setter: React.Dispatch<React.SetStateAction<Row[]>>, id: string, field: string, value: string | boolean) => {
    setter((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  const handleOfferLetterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setFormError("Offer letter must be under 10MB")
      return
    }
    setOfferLetterUploading(true)
    try {
      const bytes = await file.arrayBuffer()
      const base64 = Buffer.from(bytes).toString("base64")
      setOfferLetter({ name: file.name, data: `data:${file.type};base64,${base64}` })
      setFormError("")
    } catch {
      setFormError("Failed to read file")
    } finally {
      setOfferLetterUploading(false)
    }
  }

  const removeOfferLetter = () => {
    setOfferLetter(null)
  }

  const addRow = (setter: React.Dispatch<React.SetStateAction<Row[]>>, type: string) => {
    setter((prev) => [...prev, { id: generateId() }])
    trackEvent('add_form_row', { rowType: type })
  }

  const removeRow = (setter: React.Dispatch<React.SetStateAction<Row[]>>, id: string, type: string) => {
    setter((prev) => prev.filter((row) => row.id !== id))
    trackEvent('remove_form_row', { rowType: type, rowId: id })
  }

  const updateFirstSlideField = (field: keyof FirstSlideEmployeeForm, value: string) => {
    setFirstSlideData((prev) => ({ ...prev, [field]: value }))
    setFormError("")
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const createEmployeeMutation = useMutation({
    mutationFn: () => employeeService.createEmployee({
      firstName: firstSlideData.firstName.trim(),
      lastName: firstSlideData.lastName.trim(),
      nickname: firstSlideData.nickname || null,
      email: firstSlideData.email.trim(),
      password: firstSlideData.password || Math.random().toString(36).slice(-8) + "A1!",
      avatar: firstSlideData.avatar || "",
      department: firstSlideData.department || null,
      designation: firstSlideData.designation || null,
      location: firstSlideData.location || null,
      phone: firstSlideData.phone || null,
      alternateEmail: firstSlideData.secondaryPhone || null,
      address: firstSlideData.address || null,
      city: firstSlideData.city || null,
      state: firstSlideData.state || null,
      country: firstSlideData.country || null,
      zipCode: firstSlideData.postalCode || null,
      roleName: firstSlideData.roleName || null,
      branchName: firstSlideData.branchName || null,
      shift: firstSlideData.shift || null,
      joiningDate: firstSlideData.joiningDate || null,
      employmentType: firstSlideData.employmentType || null,
      status: firstSlideData.status.toLowerCase() === "inactive" ? "inactive" : "active",
      sourceOfHire: firstSlideData.sourceOfHire || null,
      linkedin: firstSlideData.linkedin || null,
      github: firstSlideData.github || null,
      twitter: firstSlideData.twitter || null,
      website: firstSlideData.portfolio || null,
      offerLetter: offerLetter?.data || null,
      workExperience,
      educationDetails,
      dependentDetails,
      currentExperience: firstSlideData.currentExperience || null,
      totalExperience: firstSlideData.totalExperience || null,
    }),
    onSuccess: (employee) => {
      setSavedEmployee(employee)
      queryClient.invalidateQueries({ queryKey: ["employee"] })
      queryClient.invalidateQueries({ queryKey: ["employee-stats"] })
      trackEvent('save_employee_success')
    },
    onError: (error: any) => {
      const msg = error?.message === "Validation failed" ? "Please fill in all required fields correctly." : (error?.message || "Failed to create employee. Please try again.")
      setFormError(msg)
    },
  })

  const [successModalOpen, setSuccessModalOpen] = React.useState(false)
  const [emailStatus, setEmailStatus] = React.useState<"sent" | "failed" | "skipped" | null>(null)
  const [emailError, setEmailError] = React.useState<string | undefined>(undefined)
  const [isResending, setIsResending] = React.useState(false)

  const handleSave = async () => {
    if (savedEmployee) {
      setSuccessModalOpen(true)
      return
    }

    if (!firstSlideData.firstName.trim() || !firstSlideData.email.trim()) {
      setFormError("First name and email address are required.")
      return
    }

    const finalPassword = firstSlideData.password || Math.random().toString(36).slice(-8) + "A1!"
    if (!firstSlideData.password) {
      setFirstSlideData(prev => ({ ...prev, password: finalPassword }))
    }

    trackEvent('save_employee_start')
    try {
      const employee = await employeeService.createEmployee({
        firstName: firstSlideData.firstName.trim(),
        lastName: firstSlideData.lastName.trim(),
        nickname: firstSlideData.nickname || null,
        email: firstSlideData.email.trim(),
        avatar: firstSlideData.avatar || "",
        password: finalPassword,
        department: firstSlideData.department || null,
        designation: firstSlideData.designation || null,
        location: firstSlideData.location || null,
        phone: firstSlideData.phone || null,
        alternateEmail: firstSlideData.secondaryPhone || null,
        address: firstSlideData.address || null,
        city: firstSlideData.city || null,
        state: firstSlideData.state || null,
        country: firstSlideData.country || null,
        zipCode: firstSlideData.postalCode || null,
        roleName: firstSlideData.roleName || null,
        branchName: firstSlideData.branchName || null,
        shift: firstSlideData.shift || null,
        joiningDate: firstSlideData.joiningDate || null,
        employmentType: firstSlideData.employmentType || null,
        status: firstSlideData.status.toLowerCase() === "inactive" ? "inactive" : "active",
        sourceOfHire: firstSlideData.sourceOfHire || null,
        linkedin: firstSlideData.linkedin || null,
        github: firstSlideData.github || null,
        twitter: firstSlideData.twitter || null,
        website: firstSlideData.portfolio || null,
        offerLetter: offerLetter?.data || null,
        workExperience,
        educationDetails,
        dependentDetails,
        currentExperience: firstSlideData.currentExperience || null,
        totalExperience: firstSlideData.totalExperience || null,
      })
      
      setSavedEmployee(employee)

      queryClient.invalidateQueries({ queryKey: ["employee"] })
      queryClient.invalidateQueries({ queryKey: ["employee-stats"] })
      trackEvent('save_employee_success')
      setEmailStatus((employee as any)?.emailStatus || "skipped")
      setEmailError((employee as any)?.emailError)
      setSuccessModalOpen(true)
    } catch (err: any) {
      const msg = err?.message === "Validation failed" ? "Please fill in all required fields correctly." : (err?.message || "Failed to create employee. Please try again.")
      setFormError(msg)
    }
  }

  const completeAndClose = () => {
    setSuccessModalOpen(false)
    if (savedEmployee) {
      onEmployeeAdded?.(savedEmployee)
      if (onCancel) onCancel()
    }
  }

  const handleResendEmail = async () => {
    if (!savedEmployee?.id) return
    setIsResending(true)
    try {
      const result = await employeeService.resendCredentialsEmail(savedEmployee.id as string)
      setEmailStatus(result.emailStatus as "sent" | "failed" | "skipped")
      setEmailError(result.error)
      if (result.newTempPassword) {
        setFirstSlideData(prev => ({ ...prev, password: result.newTempPassword! }))
      }
    } catch {
      setEmailStatus("failed")
      setEmailError("Failed to resend email")
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-hidden">
      <Dialog open={successModalOpen} onOpenChange={setSuccessModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Employee Created</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Account created. Share the credentials below with the user.
            </p>
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{firstSlideData.email}</p>
                </div>
                <Button size="icon" variant="ghost" className="size-8" onClick={() => navigator.clipboard.writeText(firstSlideData.email)}>
                  <CopyIcon className="size-3.5" />
                </Button>
              </div>
              <div className="border-t" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Password</p>
                  <p className="text-sm font-medium font-mono">{firstSlideData.password}</p>
                </div>
                <Button size="icon" variant="ghost" className="size-8" onClick={() => navigator.clipboard.writeText(firstSlideData.password)}>
                  <CopyIcon className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Email notification status */}
            <div className={`rounded-lg border p-3 flex items-start gap-3 ${
              emailStatus === "sent"
                ? "border-green-200 bg-green-50"
                : emailStatus === "failed"
                  ? "border-red-200 bg-red-50"
                  : "border-yellow-200 bg-yellow-50"
            }`}>
              {emailStatus === "sent" ? (
                <CheckCircleIcon className="size-4 text-green-600 mt-0.5 shrink-0" />
              ) : emailStatus === "failed" ? (
                <AlertCircleIcon className="size-4 text-red-600 mt-0.5 shrink-0" />
              ) : (
                <MailIcon className="size-4 text-yellow-600 mt-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  emailStatus === "sent" ? "text-green-800" :
                  emailStatus === "failed" ? "text-red-800" : "text-yellow-800"
                }`}>
                  {emailStatus === "sent" && "Credentials email sent successfully"}
                  {emailStatus === "failed" && "Email delivery failed"}
                  {emailStatus === "skipped" && "Email not sent (no email provider configured)"}
                </p>
                {emailError && (
                  <p className="text-xs text-red-600 mt-1 truncate">{emailError}</p>
                )}
                {emailStatus !== "sent" && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 mt-1 text-xs"
                    onClick={handleResendEmail}
                    disabled={isResending}
                  >
                    <RefreshCwIcon className={`size-3 mr-1 ${isResending ? "animate-spin" : ""}`} />
                    {isResending ? "Resending..." : "Resend credentials email"}
                  </Button>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" className="w-full" onClick={completeAndClose}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {formError && (
        <div className="mx-6 mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {formError}
        </div>
      )}

      <div className="relative flex-1 overflow-hidden px-1">
        <ScrollArea className="h-full px-4 sm:px-5">
          <div className="space-y-8 sm:space-y-12 py-4 sm:py-6 max-w-4xl mx-auto">
            
            {/* Step 1: Profile */}
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row gap-6 sm:gap-12 items-center sm:items-start mb-6">
                <div className="flex-shrink-0">
                  <ProfileImageUpload 
                    avatar={firstSlideData.avatar} 
                    onAvatarChange={(url) => updateFirstSlideField("avatar", url)} 
                  />
                </div>
                <div className="flex-1 w-full">
                  <BasicInfoSection formData={firstSlideData} onChange={updateFirstSlideField} options={dropdownOptions} />
                </div>
              </div>
              <Separator />
            </div>

            {/* Step 2: Work Info */}
            <div className="space-y-8">
              <WorkInfoSection formData={firstSlideData} onChange={updateFirstSlideField} options={dropdownOptions} />
              <Separator />
            </div>

            {/* Step 3: Contact */}
            <div className="space-y-8">
              <ContactDetailsSection
                phone={firstSlideData.phone}
                secondaryPhone={firstSlideData.secondaryPhone}
                address={firstSlideData.address}
                city={firstSlideData.city}
                state={firstSlideData.state}
                postalCode={firstSlideData.postalCode}
                country={firstSlideData.country}
                onPhoneChange={(v) => updateFirstSlideField("phone", v)}
                onSecondaryPhoneChange={(v) => updateFirstSlideField("secondaryPhone", v)}
                onAddressChange={(v) => updateFirstSlideField("address", v)}
                onCityChange={(v) => updateFirstSlideField("city", v)}
                onStateChange={(v) => updateFirstSlideField("state", v)}
                onPostalCodeChange={(v) => updateFirstSlideField("postalCode", v)}
                onCountryChange={(v) => updateFirstSlideField("country", v)}
                options={dropdownOptions}
              />
              <Separator />
              <FieldSet>
                <FieldLegend>Separation Information</FieldLegend>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>Date of Exit</FieldLabel>
                    <Input type="date" placeholder="dd-MMM-yyyy" />
                  </Field>
                </div>
              </FieldSet>
              <Separator />
            </div>

            {/* Step 4: Documents */}
            <div className="space-y-8">
              <FieldSet>
                <FieldLegend>Documents</FieldLegend>
                <div className="space-y-4">
                  <Field>
                    <FieldLabel>Offer Letter</FieldLabel>
                    {offerLetter ? (
                      <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/20">
                        <FileTextIcon className="size-5 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate flex-1">{offerLetter.name}</span>
                        <button type="button" onClick={removeOfferLetter} className="text-destructive hover:text-destructive/80">
                          <XIcon className="size-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-3 rounded-lg border border-dashed p-4 cursor-pointer hover:bg-muted/20 transition-colors">
                        <UploadIcon className="size-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {offerLetterUploading ? "Uploading..." : "Upload offer letter (PDF, max 10MB)"}
                        </span>
                        <input type="file" accept=".pdf,image/*" className="hidden" onChange={handleOfferLetterUpload} disabled={offerLetterUploading} />
                      </label>
                    )}
                  </Field>
                </div>
              </FieldSet>
              <Separator />
            </div>

            {/* Step 5: History */}
            <div className="space-y-8 pb-8">
              <DynamicRowSection
                title="Work experience"
                rows={workExperience}
                onAdd={() => addRow(setWorkExperience, 'work_experience')}
                onRemove={(id) => removeRow(setWorkExperience, id, 'work_experience')}
                renderRow={(row) => (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel>Company name</FieldLabel>
                      <Input value={row.company || ""} onChange={(e) => updateWorkRow(row.id, "company", e.target.value)} placeholder="Company name" />
                    </Field>
                    <Field>
                      <FieldLabel>Job Title</FieldLabel>
                      <Input value={row.title || ""} onChange={(e) => updateWorkRow(row.id, "title", e.target.value)} placeholder="Job Title" />
                    </Field>
                    <Field>
                      <FieldLabel>Roles</FieldLabel>
                      <Input value={row.roles || ""} onChange={(e) => updateWorkRow(row.id, "roles", e.target.value)} placeholder="e.g. Developer, Team Lead" />
                    </Field>
                    <Field>
                      <FieldLabel>From Date</FieldLabel>
                      <Input type="date" value={row.from || ""} onChange={(e) => updateWorkRow(row.id, "from", e.target.value)} />
                    </Field>
                    <Field>
                      <FieldLabel>To Date</FieldLabel>
                      <Input type="date" value={row.to || ""} onChange={(e) => updateWorkRow(row.id, "to", e.target.value)} />
                    </Field>
                    <div className="flex items-center gap-2">
                      <Checkbox id={`relevant-${row.id}`} checked={!!row.relevant} onCheckedChange={(c) => updateWorkRow(row.id, "relevant", !!c)} />
                      <label htmlFor={`relevant-${row.id}`} className="text-sm font-medium">Relevant</label>
                    </div>
                    <Field className="sm:col-span-2">
                      <FieldLabel>Job Description</FieldLabel>
                      <textarea className="min-h-[60px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring" value={row.description || ""} onChange={(e) => updateWorkRow(row.id, "description", e.target.value)} placeholder="Job Description" />
                    </Field>
                  </div>
                )}
              />
              <Separator />
              <DynamicRowSection
                title="Education Details"
                rows={educationDetails}
                onAdd={() => addRow(setEducationDetails, 'education')}
                onRemove={(id) => removeRow(setEducationDetails, id, 'education')}
                renderRow={(row) => (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel>Institute Name</FieldLabel>
                      <Input value={row.institute || ""} onChange={(e) => updateRow(setEducationDetails, row.id, "institute", e.target.value)} placeholder="Institute Name" />
                    </Field>
                    <Field>
                      <FieldLabel>Degree/Diploma</FieldLabel>
                      <Input value={row.degree || ""} onChange={(e) => updateRow(setEducationDetails, row.id, "degree", e.target.value)} placeholder="Degree/Diploma" />
                    </Field>
                    <Field>
                      <FieldLabel>Specialization</FieldLabel>
                      <Input value={row.specialization || ""} onChange={(e) => updateRow(setEducationDetails, row.id, "specialization", e.target.value)} placeholder="Specialization" />
                    </Field>
                    <Field>
                      <FieldLabel>Date of Completion</FieldLabel>
                      <Input type="date" value={row.completionDate || ""} onChange={(e) => updateRow(setEducationDetails, row.id, "completionDate", e.target.value)} />
                    </Field>
                  </div>
                )}
              />
              <Separator />
              <DynamicRowSection
                title="Dependent Details"
                rows={dependentDetails}
                onAdd={() => addRow(setDependentDetails, 'dependents')}
                onRemove={(id) => removeRow(setDependentDetails, id, 'dependents')}
                renderRow={(row) => (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel>Name</FieldLabel>
                      <Input value={row.name || ""} onChange={(e) => updateRow(setDependentDetails, row.id, "name", e.target.value)} placeholder="Name" />
                    </Field>
                    <SelectWithAdd
                      label="Relationship"
                      options={["Spouse", "Child", "Parent"]}
                      value={row.relationship}
                      onChange={(value) => updateRow(setDependentDetails, row.id, "relationship", value)}
                    />
                    <Field>
                      <FieldLabel>Date of Birth</FieldLabel>
                      <Input type="date" value={row.dob || ""} onChange={(e) => updateRow(setDependentDetails, row.id, "dob", e.target.value)} />
                    </Field>
                  </div>
                )}
              />
            </div>
          </div>
        </ScrollArea>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t bg-muted/10">
        <Button variant="ghost" onClick={onCancel} className="order-2 sm:order-1">
          Cancel
        </Button>
        <div className="flex gap-3 order-1 sm:order-2">
          <Button className="bg-primary hover:bg-primary/80 w-full sm:w-32 touch-target" onClick={handleSave} disabled={createEmployeeMutation.isPending}>
            {createEmployeeMutation.isPending ? "Saving..." : "Save Employee"}
          </Button>
        </div>
      </div>
    </div>
  )
}
