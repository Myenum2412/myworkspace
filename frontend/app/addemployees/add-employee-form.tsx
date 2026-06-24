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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CopyIcon, Loader2, UploadIcon, FileIcon, XIcon } from "lucide-react"
import { getDropdownOptions } from "@/lib/dropdown-options"

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
  SocialPresenceSection,
  type FirstSlideEmployeeForm,
  type Row,
} from "./employee-form-sections"

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
  const [formData, setFormData] = React.useState<FirstSlideEmployeeForm>({
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
    phone: "",
    alternateEmail: "",
    address: "",
    city: "",
    state: "",
    country: "",
    zipCode: "",
    linkedin: "",
    github: "",
    twitter: "",
    website: "",
  })

  React.useEffect(() => {
    const prefix = localStorage.getItem("employeeIdPrefix")
    if (prefix) {
      const count = parseInt(localStorage.getItem("employeeIdCount") || "1", 10)
      const displayId = `${prefix}${String(count).padStart(3, '0')}`
      setFormData(prev => ({ ...prev, displayId }))
    }
  }, [])

  const [workExperience, setWorkExperience] = React.useState<Row[]>([
    { id: "1", company: "", title: "", from: "", to: "", description: "", relevant: false },
  ])
  const [educationDetails, setEducationDetails] = React.useState<Row[]>([
    { id: "1", institute: "", degree: "", specialization: "", completionDate: "" },
  ])
  const [dependentDetails, setDependentDetails] = React.useState<Row[]>([
    { id: "1", name: "", relationship: "", dob: "" },
  ])

  const [dropdownOptions, setDropdownOptions] = React.useState<Record<string, string[]>>({})

  const [orgId, setOrgId] = React.useState("")
  const [uploadedFiles, setUploadedFiles] = React.useState<Array<{ id: string; name: string; size: number }>>([])
  const [uploadingFile, setUploadingFile] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    setDropdownOptions(getDropdownOptions())
    fetch("/api/user/profile", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const profile = d.data || d
        const id = profile?.org?.id || profile?.org?._id?.toString() || ""
        if (id) setOrgId(id)
      })
      .catch(() => {})
  }, [])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !orgId) return
    setUploadingFile(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("orgId", orgId)
      fd.append("category", "profile")
      const res = await fetch("/api/files", { method: "POST", body: fd })
      if (!res.ok) throw new Error("Upload failed")
      const data = await res.json()
      setUploadedFiles((prev) => [...prev, { id: data.id, name: file.name, size: file.size }])
    } catch {
      setFormError("Failed to upload file")
    } finally {
      setUploadingFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  const addRow = (setter: React.Dispatch<React.SetStateAction<Row[]>>, type: string) => {
    setter((prev) => [...prev, { id: generateId() }])
    trackEvent('add_form_row', { rowType: type })
  }

  const removeRow = (setter: React.Dispatch<React.SetStateAction<Row[]>>, id: string, type: string) => {
    setter((prev) => prev.filter((row) => row.id !== id))
    trackEvent('remove_form_row', { rowType: type, rowId: id })
  }

  const updateRow = (
    setter: React.Dispatch<React.SetStateAction<Row[]>>,
    id: string,
    field: string,
    value: string | boolean
  ) => {
    setter((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)))
  }

  const updateField = (field: keyof FirstSlideEmployeeForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setFormError("")
  }

  const [successModalOpen, setSuccessModalOpen] = React.useState(false)

  const createEmployeeMutation = useMutation({
    mutationFn: () => employeeService.createEmployee({
      empId: formData.displayId.trim() || undefined,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
      avatar: formData.avatar || "",
      password: formData.password || Math.random().toString(36).slice(-8) + "A1!",
      department: formData.department || null,
      phone: formData.phone || null,
      roleName: formData.roleName || formData.designation || null,
      branchName: formData.branchName || formData.location || null,
      employmentType: formData.employmentType || null,
      status: formData.status.toLowerCase() === "inactive" ? "inactive" : "active",
      sourceOfHire: formData.sourceOfHire || null,
      workExperience,
      educationDetails,
      dependentDetails,
      currentExperience: formData.currentExperience || null,
      totalExperience: formData.totalExperience || null,
      alternateEmail: formData.alternateEmail || null,
      address: formData.address || null,
      city: formData.city || null,
      state: formData.state || null,
      country: formData.country || null,
      zipCode: formData.zipCode || null,
      linkedin: formData.linkedin || null,
      github: formData.github || null,
      twitter: formData.twitter || null,
      website: formData.website || null,
      files: uploadedFiles.map((f) => f.id),
    }),
    onSuccess: (employee) => {
      setSavedEmployee(employee)
      queryClient.invalidateQueries({ queryKey: ["employee"] })
      queryClient.invalidateQueries({ queryKey: ["employee-stats"] })
      trackEvent('save_employee_success')

      const currentCount = parseInt(localStorage.getItem("employeeIdCount") || "1", 10)
      localStorage.setItem("employeeIdCount", String(currentCount + 1))

      setSuccessModalOpen(true)
    },
    onError: (error: any) => {
      console.error("Create employee error:", error)
      setFormError(error?.message || "Failed to create employee. Please try again.")
    },
  })

  const handleSave = () => {
    if (!formData.firstName.trim() || !formData.email.trim()) {
      setFormError("First name and email address are required.")
      return
    }
    trackEvent('save_employee_start')
    createEmployeeMutation.mutate()
  }

  const completeAndClose = () => {
    setSuccessModalOpen(false);
    if (savedEmployee) {
      onEmployeeAdded?.(savedEmployee);
    }
    onCancel?.();
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Dialog open={successModalOpen} onOpenChange={setSuccessModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Employee Created</DialogTitle>
            <DialogDescription>
              The account has been successfully created. Please securely share the following login credentials with the user.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 my-4 bg-muted/50 p-4 rounded-lg">
            <div className="grid flex-1 gap-2">
              <div className="text-sm">
                <span className="font-semibold">Email:</span> {formData.email}
              </div>
              <div className="text-sm">
                <span className="font-semibold">Password:</span> {(savedEmployee?.password as string) || formData.password || "(auto-generated)"}
              </div>
            </div>
            <Button size="sm" className="px-3" onClick={() => {
              navigator.clipboard.writeText(`Email: ${formData.email}\nPassword: ${formData.password}`)
            }}>
              <span className="sr-only">Copy</span>
              <CopyIcon className="h-4 w-4" />
            </Button>
          </div>
          <DialogFooter className="sm:justify-end">
            <Button type="button" variant="default" onClick={completeAndClose}>
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

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full px-6">
          <div className="space-y-8 py-6">
            <div>
              <h2 className="text-lg font-semibold mb-6">Profile</h2>
              <div className="flex gap-12 items-start">
                <div className="flex-shrink-0">
                  <ProfileImageUpload
                    avatar={formData.avatar}
                    onAvatarChange={(url: string) => updateField("avatar", url)}
                  />
                </div>
                <div className="flex-1">
                  <BasicInfoSection formData={formData} onChange={updateField} options={dropdownOptions} />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h2 className="text-lg font-semibold mb-6">Work Information</h2>
              <WorkInfoSection formData={formData} onChange={updateField} options={dropdownOptions} />
            </div>

            <Separator />

            <div>
              <h2 className="text-lg font-semibold mb-6">Contact Details</h2>
              <ContactDetailsSection formData={formData} onChange={updateField} options={dropdownOptions} />
            </div>

            <Separator />

            <div>
              <h2 className="text-lg font-semibold mb-6">Social Presence</h2>
              <SocialPresenceSection formData={formData} onChange={updateField} />
            </div>

            <Separator />

            <div>
              <h2 className="text-lg font-semibold mb-6">Document Upload</h2>
              <div className="rounded-lg border border-dashed p-6">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-3">
                  <UploadIcon className="size-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Upload documents (resume, offer letter, etc.)</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile || !orgId}
                  >
                    {uploadingFile ? <Loader2 className="size-4 animate-spin mr-2" /> : <UploadIcon className="size-4 mr-2" />}
                    {uploadingFile ? "Uploading..." : "Choose File"}
                  </Button>
                  {!orgId && (
                    <p className="text-xs text-amber-600">Loading organization...</p>
                  )}
                </div>
                {uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {uploadedFiles.map((f) => (
                      <div key={f.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <FileIcon className="size-4 text-muted-foreground" />
                          <span className="truncate max-w-[200px]">{f.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({(f.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button type="button" onClick={() => removeFile(f.id)} className="text-muted-foreground hover:text-destructive">
                          <XIcon className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div>
              <h2 className="text-lg font-semibold mb-6">Work Experience</h2>
              <DynamicRowSection
                title="Work experience"
                rows={workExperience}
                onAdd={() => addRow(setWorkExperience, 'work_experience')}
                onRemove={(id: string) => removeRow(setWorkExperience, id, 'work_experience')}
                renderRow={(row: Row) => (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel>Company name</FieldLabel>
                      <Input
                        value={row.company || ""}
                        onChange={(e) => updateRow(setWorkExperience, row.id, "company", e.target.value)}
                        placeholder="Company name"
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Job Title</FieldLabel>
                      <Input
                        value={row.title || ""}
                        onChange={(e) => updateRow(setWorkExperience, row.id, "title", e.target.value)}
                        placeholder="Job Title"
                      />
                    </Field>
                    <Field>
                      <FieldLabel>From Date</FieldLabel>
                      <Input
                        type="date"
                        value={row.from || ""}
                        onChange={(e) => updateRow(setWorkExperience, row.id, "from", e.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>To Date</FieldLabel>
                      <Input
                        type="date"
                        value={row.to || ""}
                        onChange={(e) => updateRow(setWorkExperience, row.id, "to", e.target.value)}
                      />
                    </Field>
                    <Field className="sm:col-span-2">
                      <FieldLabel>Job Description</FieldLabel>
                      <textarea
                        className="min-h-[60px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring"
                        placeholder="Job Description"
                        value={row.description || ""}
                        onChange={(e) => updateRow(setWorkExperience, row.id, "description", e.target.value)}
                      />
                    </Field>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`relevant-${row.id}`}
                        checked={!!row.relevant}
                        onCheckedChange={(checked) => updateRow(setWorkExperience, row.id, "relevant", !!checked)}
                      />
                      <label htmlFor={`relevant-${row.id}`} className="text-sm font-medium">Relevant</label>
                    </div>
                  </div>
                )}
              />
            </div>

            <Separator />

            <div>
              <h2 className="text-lg font-semibold mb-6">Education Details</h2>
              <DynamicRowSection
                title="Education Details"
                rows={educationDetails}
                onAdd={() => addRow(setEducationDetails, 'education')}
                onRemove={(id: string) => removeRow(setEducationDetails, id, 'education')}
                renderRow={(row: Row) => (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel>Institute Name</FieldLabel>
                      <Input
                        value={row.institute || ""}
                        onChange={(e) => updateRow(setEducationDetails, row.id, "institute", e.target.value)}
                        placeholder="Institute Name"
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Degree/Diploma</FieldLabel>
                      <Input
                        value={row.degree || ""}
                        onChange={(e) => updateRow(setEducationDetails, row.id, "degree", e.target.value)}
                        placeholder="Degree/Diploma"
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Specialization</FieldLabel>
                      <Input
                        value={row.specialization || ""}
                        onChange={(e) => updateRow(setEducationDetails, row.id, "specialization", e.target.value)}
                        placeholder="Specialization"
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Date of Completion</FieldLabel>
                      <Input
                        type="date"
                        value={row.completionDate || ""}
                        onChange={(e) => updateRow(setEducationDetails, row.id, "completionDate", e.target.value)}
                      />
                    </Field>
                  </div>
                )}
              />
            </div>

            <Separator />

            <div>
              <h2 className="text-lg font-semibold mb-6">Dependent Details</h2>
              <DynamicRowSection
                title="Dependent Details"
                rows={dependentDetails}
                onAdd={() => addRow(setDependentDetails, 'dependents')}
                onRemove={(id: string) => removeRow(setDependentDetails, id, 'dependents')}
                renderRow={(row: Row) => (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel>Name</FieldLabel>
                      <Input
                        value={row.name || ""}
                        onChange={(e) => updateRow(setDependentDetails, row.id, "name", e.target.value)}
                        placeholder="Name"
                      />
                    </Field>
                    <SelectWithAdd
                      label="Relationship"
                      options={["Spouse", "Child", "Parent"]}
                      value={row.relationship || ""}
                      onChange={(value: string) => updateRow(setDependentDetails, row.id, "relationship", value)}
                    />
                    <Field>
                      <FieldLabel>Date of Birth</FieldLabel>
                      <Input
                        type="date"
                        value={row.dob || ""}
                        onChange={(e) => updateRow(setDependentDetails, row.id, "dob", e.target.value)}
                      />
                    </Field>
                  </div>
                )}
              />
            </div>
          </div>
        </ScrollArea>
      </div>

      <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/10">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button className="bg-primary hover:bg-primary/80 w-32" onClick={handleSave} disabled={createEmployeeMutation.isPending}>
          {createEmployeeMutation.isPending ? (
            <><Loader2 className="mr-2 size-4 animate-spin" /> Saving...</>
          ) : (
            "Save Employee"
          )}
        </Button>
      </div>
    </div>
  )
}
