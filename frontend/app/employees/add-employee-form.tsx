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
import { CopyIcon, Loader2 } from "lucide-react"
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
  SocialPresenceSection,
  type FirstSlideEmployeeForm,
  Row,
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

  React.useEffect(() => {
    setDropdownOptions(getDropdownOptions())
  }, [])

  const addRow = (setter: React.Dispatch<React.SetStateAction<Row[]>>, type: string) => {
    setter((prev) => [...prev, { id: generateId() }])
    trackEvent('add_form_row', { rowType: type })
  }

  const removeRow = (setter: React.Dispatch<React.SetStateAction<Row[]>>, id: string, type: string) => {
    setter((prev) => prev.filter((row) => row.id !== id))
    trackEvent('remove_form_row', { rowType: type, rowId: id })
  }

  const updateRowField = (
    setter: React.Dispatch<React.SetStateAction<Row[]>>,
    rowId: string,
    field: string,
    value: any
  ) => {
    setter((prev) =>
      prev.map((row) =>
        row.id === rowId ? { ...row, [field]: value } : row
      )
    )
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
      workExperience: workExperience.filter(w => w.company || w.title),
      educationDetails: educationDetails.filter(e => e.institute || e.degree),
      dependentDetails: dependentDetails.filter(d => d.name),
      currentExperience: formData.currentExperience || null,
      totalExperience: formData.totalExperience || null,
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
    setSuccessModalOpen(false)
    if (savedEmployee) {
      onEmployeeAdded?.(savedEmployee)
      if (onCancel) onCancel()
    }
  }

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
                <span className="font-semibold">Password:</span> {formData.password || "(auto-generated)"}
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
                    onAvatarChange={(url) => updateField("avatar", url)}
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
              <ContactDetailsSection
                phone={formData.phone}
                address={formData.address}
                city={formData.city}
                state={formData.state}
                country={formData.country}
                onPhoneChange={(value) => updateField("phone", value)}
                onAddressChange={(value) => updateField("address", value)}
                onCityChange={(value) => updateField("city", value)}
                onStateChange={(value) => updateField("state", value)}
                onCountryChange={(value) => updateField("country", value)}
              />
            </div>

            <Separator />

            <div>
              <h2 className="text-lg font-semibold mb-6">Social Presence</h2>
              <SocialPresenceSection
                linkedin={formData.linkedin}
                github={formData.github}
                twitter={formData.twitter}
                onLinkedinChange={(value) => updateField("linkedin", value)}
                onGithubChange={(value) => updateField("github", value)}
                onTwitterChange={(value) => updateField("twitter", value)}
              />
            </div>

            <Separator />

            <div>
              <h2 className="text-lg font-semibold mb-6">Work Experience</h2>
              <DynamicRowSection
                title="Work experience"
                rows={workExperience}
                onAdd={() => addRow(setWorkExperience, 'work_experience')}
                onRemove={(id) => removeRow(setWorkExperience, id, 'work_experience')}
                renderRow={(row) => (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel>Company name</FieldLabel>
                      <Input
                        placeholder="Company name"
                        value={row.company || ""}
                        onChange={(e) => updateRowField(setWorkExperience, row.id, "company", e.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Job Title</FieldLabel>
                      <Input
                        placeholder="Job Title"
                        value={row.title || ""}
                        onChange={(e) => updateRowField(setWorkExperience, row.id, "title", e.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>From Date</FieldLabel>
                      <Input
                        type="date"
                        value={row.from || ""}
                        onChange={(e) => updateRowField(setWorkExperience, row.id, "from", e.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>To Date</FieldLabel>
                      <Input
                        type="date"
                        value={row.to || ""}
                        onChange={(e) => updateRowField(setWorkExperience, row.id, "to", e.target.value)}
                      />
                    </Field>
                    <Field className="sm:col-span-2">
                      <FieldLabel>Job Description</FieldLabel>
                      <textarea
                        className="min-h-[60px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring"
                        placeholder="Job Description"
                        value={row.description || ""}
                        onChange={(e) => updateRowField(setWorkExperience, row.id, "description", e.target.value)}
                      />
                    </Field>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`relevant-${row.id}`}
                        checked={row.relevant || false}
                        onCheckedChange={(checked) => updateRowField(setWorkExperience, row.id, "relevant", checked)}
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
                onRemove={(id) => removeRow(setEducationDetails, id, 'education')}
                renderRow={(row) => (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel>Institute Name</FieldLabel>
                      <Input
                        placeholder="Institute Name"
                        value={row.institute || ""}
                        onChange={(e) => updateRowField(setEducationDetails, row.id, "institute", e.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Degree/Diploma</FieldLabel>
                      <Input
                        placeholder="Degree/Diploma"
                        value={row.degree || ""}
                        onChange={(e) => updateRowField(setEducationDetails, row.id, "degree", e.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Specialization</FieldLabel>
                      <Input
                        placeholder="Specialization"
                        value={row.specialization || ""}
                        onChange={(e) => updateRowField(setEducationDetails, row.id, "specialization", e.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Date of Completion</FieldLabel>
                      <Input
                        type="date"
                        value={row.completionDate || ""}
                        onChange={(e) => updateRowField(setEducationDetails, row.id, "completionDate", e.target.value)}
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
                onRemove={(id) => removeRow(setDependentDetails, id, 'dependents')}
                renderRow={(row) => (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel>Name</FieldLabel>
                      <Input
                        placeholder="Name"
                        value={row.name || ""}
                        onChange={(e) => updateRowField(setDependentDetails, row.id, "name", e.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Relationship</FieldLabel>
                      <select
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring"
                        value={row.relationship || ""}
                        onChange={(e) => updateRowField(setDependentDetails, row.id, "relationship", e.target.value)}
                      >
                        <option value="">Select relationship</option>
                        <option value="Spouse">Spouse</option>
                        <option value="Child">Child</option>
                        <option value="Parent">Parent</option>
                        <option value="Sibling">Sibling</option>
                        <option value="Other">Other</option>
                      </select>
                    </Field>
                    <Field>
                      <FieldLabel>Date of Birth</FieldLabel>
                      <Input
                        type="date"
                        value={row.dob || ""}
                        onChange={(e) => updateRowField(setDependentDetails, row.id, "dob", e.target.value)}
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
