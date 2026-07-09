"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import {
  Field,
  FieldLabel,
} from "@/components/ui/field"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertCircleIcon, SaveIcon, Loader2Icon, UserIcon, BriefcaseIcon, PhoneIcon, HistoryIcon, CheckCircle2Icon, PencilIcon } from "lucide-react"
import { employeeService } from "@/lib/services/employee-service"
import { getDropdownOptions } from "@/lib/dropdown-options"

import {
  ProfileImageUpload,
  BasicInfoSection,
  WorkInfoSection,
  ContactDetailsSection,
  DynamicRowSection,
  SelectWithAdd,
  type FirstSlideEmployeeForm,
  type Row,
} from "@/app/employees/employee-form-sections"
import type { Employee } from "./columns"

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function toRow(arr: any[] | undefined, defaults: Record<string, any>): Row[] {
  if (!arr || arr.length === 0) return [{ id: generateId(), ...defaults }]
  return arr.map((item) => ({ id: generateId(), ...item }))
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
        <Icon className="size-3.5" />
        {title}
      </h3>
      {children}
    </div>
  )
}

interface EmployeeEditFormProps {
  employee: Employee
  onSave: (updated: Employee) => void
  onCancel: () => void
  isViewMode?: boolean
  onSwitchToEdit?: () => void
}

export function EmployeeEditForm({ employee, onSave, onCancel, isViewMode, onSwitchToEdit }: EmployeeEditFormProps) {
  const [formError, setFormError] = useState("")
  const [formSuccess, setFormSuccess] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [dropdownOptions, setDropdownOptions] = useState<Record<string, string[]>>({})

  useEffect(() => {
    setDropdownOptions(getDropdownOptions());
  }, [])

  const nameParts = employee.name ? employee.name.trim().split(" ") : []
  const defaultFirstName = employee.firstName || nameParts[0] || ""
  const defaultLastName = employee.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(" ") : "")

  const [formData, setFormData] = useState<FirstSlideEmployeeForm>({
    displayId: employee.displayId || "",
    firstName: defaultFirstName,
    lastName: defaultLastName,
    nickname: employee.nickname || "",
    email: employee.email || "",
    password: employee.password || "",
    department: employee.department || "",
    location: employee.location || "",
    designation: employee.designation || "",
    roleName: employee.role || "",
    employmentType: employee.employmentType || "",
    status: employee.status || "Active",
    branchName: employee.branchName || "",
    shift: employee.shift || "",
    sourceOfHire: employee.sourceOfHire || "",
    joiningDate: employee.joiningDate || "",
    currentExperience: employee.currentExperience || "",
    totalExperience: employee.totalExperience || "",
    avatar: employee.avatar || "",
    phone: employee.phone || "",
    secondaryPhone: employee.alternateEmail || "",
    address: employee.address || "",
    city: employee.city || "",
    state: employee.state || "",
    country: employee.country || "",
    postalCode: employee.zipCode || "",
    linkedin: employee.linkedin || "",
    github: employee.github || "",
    twitter: employee.twitter || "",
    portfolio: employee.website || "",
  })

  const [workExperience, setWorkExperience] = useState<Row[]>(
    toRow(employee.workExperience, { company: "", title: "", roles: "", from: "", to: "", description: "", relevant: false })
  )
  const [educationDetails, setEducationDetails] = useState<Row[]>(
    toRow(employee.educationDetails, { institute: "", degree: "", specialization: "", completionDate: "" })
  )
  const [dependentDetails, setDependentDetails] = useState<Row[]>(
    toRow(employee.dependentDetails, { name: "", relationship: "", dob: "" })
  )

  const updateField = (field: keyof FirstSlideEmployeeForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setFormError("")
  }

  const addRow = (setter: React.Dispatch<React.SetStateAction<Row[]>>) => {
    setter((prev) => [...prev, { id: generateId() }])
  }

  const removeRow = (setter: React.Dispatch<React.SetStateAction<Row[]>>, id: string) => {
    setter((prev) => prev.filter((row) => row.id !== id))
  }

  const updateRow = (
    setter: React.Dispatch<React.SetStateAction<Row[]>>,
    id: string,
    field: string,
    value: string | boolean
  ) => {
    setter((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)))
  }

  const handleSave = async () => {
    if (!formData.firstName.trim() || !formData.email.trim()) {
      setFormError("First name and email address are required.")
      return
    }
    setFormError("")
    setFormSuccess("")
    setSubmitting(true)

    try {
      const payload: Record<string, unknown> = {
        id: employee.id,
        firstName: formData.firstName,
        lastName: formData.lastName,
        nickname: formData.nickname,
        email: formData.email,
        role: formData.roleName || formData.designation,
        status: formData.status.toLowerCase(),
        department: formData.department,
        designation: formData.designation,
        employmentType: formData.employmentType,
        phone: formData.phone,
        branchName: formData.branchName,
        location: formData.location,
        shift: formData.shift,
        sourceOfHire: formData.sourceOfHire,
        joiningDate: formData.joiningDate || null,
        currentExperience: formData.currentExperience,
        totalExperience: formData.totalExperience,
        avatar: formData.avatar || "",
        alternateEmail: formData.secondaryPhone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        zipCode: formData.postalCode,
        linkedin: formData.linkedin || null,
        github: formData.github || null,
        twitter: formData.twitter || null,
        website: formData.portfolio || null,
        workExperience: workExperience.filter(w => w.company || w.title),
        educationDetails: educationDetails.filter(e => e.institute || e.degree),
        dependentDetails: dependentDetails.filter(d => d.name),
        files: [],
      };
      if (formData.password) {
        payload.password = formData.password;
      }
      const updated = await employeeService.updateEmployee(payload as any);

      setFormSuccess("Employee updated successfully.")
      onSave(updated as Employee)
    } catch (err: any) {
      const msg = err?.message === "Validation failed" ? "Please fill in all required fields correctly." : (err?.message || "Failed to update employee. Please try again.")
      setFormError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 shrink-0 bg-white border-b">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-black">
          <UserIcon className="size-5" />
          {isViewMode ? "Employee Details" : "Edit Employee"}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {isViewMode ? "View employee information across all sections." : "Update employee details across all sections."}
        </p>
      </div>

      {formSuccess && (
        <div className="mx-4 sm:mx-6 flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          <CheckCircle2Icon className="size-4 shrink-0" />
          {formSuccess}
        </div>
      )}
      {formError && (
        <div className="mx-4 sm:mx-6 flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircleIcon className="size-4 shrink-0" />
          {formError}
        </div>
      )}

      <div className={`flex-1 overflow-y-auto px-4 sm:px-6 py-3 space-y-5 ${
        isViewMode ? "[&_input:disabled]:bg-white [&_input:disabled]:text-black [&_input:disabled]:opacity-100 [&_select:disabled]:bg-white [&_select:disabled]:text-black [&_select:disabled]:opacity-100 [&_textarea:disabled]:bg-white [&_textarea:disabled]:text-black [&_textarea:disabled]:opacity-100" : ""
      }`}>
        <fieldset disabled={isViewMode} className="space-y-5 border-0 p-0 m-0 min-w-0">
        {/* Profile */}
        <Section icon={UserIcon} title="Profile">
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-center sm:items-start">
            <div className="shrink-0">
              <ProfileImageUpload
                avatar={formData.avatar}
                onAvatarChange={(url: string) => updateField("avatar", url)}
              />
            </div>
            <div className="flex-1 w-full">
              <BasicInfoSection formData={formData} onChange={updateField} options={dropdownOptions} />
            </div>
          </div>
        </Section>

        <Separator />

        {/* Work Info */}
        <Section icon={BriefcaseIcon} title="Work Info">
          <WorkInfoSection formData={formData} onChange={updateField} options={dropdownOptions} />
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Date of Exit</FieldLabel>
              <Input type="date" placeholder="dd-MMM-yyyy" />
            </Field>
          </div>
        </Section>

        <Separator />

        {/* Contact */}
        <Section icon={PhoneIcon} title="Contact">
          <ContactDetailsSection
                phone={formData.phone}
                secondaryPhone={formData.secondaryPhone}
                address={formData.address}
                city={formData.city}
                state={formData.state}
                postalCode={formData.postalCode}
                country={formData.country}
                onPhoneChange={(v) => updateField("phone", v)}
                onSecondaryPhoneChange={(v) => updateField("secondaryPhone", v)}
                onAddressChange={(v) => updateField("address", v)}
                onCityChange={(v) => updateField("city", v)}
                onStateChange={(v) => updateField("state", v)}
                onPostalCodeChange={(v) => updateField("postalCode", v)}
                onCountryChange={(v) => updateField("country", v)}
                options={dropdownOptions}
              />
        </Section>

        <Separator />

        {/* History */}
        <Section icon={HistoryIcon} title="History">
          <div className="space-y-6">
            <DynamicRowSection
              title="Work Experience"
              rows={workExperience}
              onAdd={() => addRow(setWorkExperience)}
              onRemove={(id: string) => removeRow(setWorkExperience, id)}
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
                    <FieldLabel>Roles</FieldLabel>
                    <Input
                      value={row.roles || ""}
                      onChange={(e) => updateRow(setWorkExperience, row.id, "roles", e.target.value)}
                      placeholder="e.g. Developer, Team Lead"
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

            <DynamicRowSection
              title="Education Details"
              rows={educationDetails}
              onAdd={() => addRow(setEducationDetails)}
              onRemove={(id: string) => removeRow(setEducationDetails, id)}
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

            <DynamicRowSection
              title="Dependent Details"
              rows={dependentDetails}
              onAdd={() => addRow(setDependentDetails)}
              onRemove={(id: string) => removeRow(setDependentDetails, id)}
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
        </Section>
        </fieldset>
      </div>

      <div className="shrink-0 border-t px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-2 sm:gap-2 justify-end bg-white mt-4">
        {isViewMode ? (
          <Button onClick={() => onSwitchToEdit && onSwitchToEdit()} className="w-full sm:w-auto touch-target">
            <PencilIcon className="size-3.5 mr-1.5" />
            Edit Employee
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={onCancel} disabled={submitting} className="w-full sm:w-auto touch-target">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={submitting || !formData.firstName.trim() || !formData.email.trim()} className="w-full sm:w-auto touch-target">
              {submitting ? <Loader2Icon className="size-4 animate-spin" /> : <><SaveIcon className="size-3.5 mr-1.5" />Save Changes</>}
            </Button>
          </>
        )}
      </div>
    </>
  )
}
