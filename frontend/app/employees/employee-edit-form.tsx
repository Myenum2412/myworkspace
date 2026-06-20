"use client"

import { useState } from "react"
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
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"

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
} from "@/app/addemployees/employee-form-sections"
import type { Employee } from "./columns"

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function toRow(arr: any[] | undefined, defaults: Record<string, any>): Row[] {
  if (!arr || arr.length === 0) return [{ id: generateId(), ...defaults }]
  return arr.map((item) => ({ id: generateId(), ...item }))
}

interface EmployeeEditFormProps {
  employee: Employee
  onSave: (updated: Employee) => void
  onCancel: () => void
}

export function EmployeeEditForm({ employee, onSave, onCancel }: EmployeeEditFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formError, setFormError] = useState("")

  const [formData, setFormData] = useState<FirstSlideEmployeeForm>({
    displayId: employee.displayId || "",
    firstName: employee.firstName || "",
    lastName: employee.lastName || "",
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
    alternateEmail: employee.alternateEmail || "",
    address: employee.address || "",
    city: employee.city || "",
    state: employee.state || "",
    country: employee.country || "",
    zipCode: employee.zipCode || "",
    linkedin: employee.linkedin || "",
    github: employee.github || "",
    twitter: employee.twitter || "",
    website: employee.website || "",
  })

  const [workExperience, setWorkExperience] = useState<Row[]>(
    toRow(employee.workExperience, { company: "", title: "", from: "", to: "", description: "", relevant: false })
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

  const nextStep = () => {
    if (currentStep === 1) {
      if (!formData.firstName.trim() || !formData.email.trim()) {
        setFormError("First name and email address are required.")
        return
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, 5))
  }

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const handleSave = () => {
    if (!formData.firstName.trim() || !formData.email.trim()) {
      setFormError("First name and email address are required.")
      return
    }

    const updated: Employee = {
      ...employee,
      displayId: formData.displayId,
      firstName: formData.firstName,
      lastName: formData.lastName,
      name: `${formData.firstName} ${formData.lastName}`.trim(),
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
      joiningDate: formData.joiningDate || "",
      currentExperience: formData.currentExperience,
      totalExperience: formData.totalExperience,
      avatar: formData.avatar || "",
      alternateEmail: formData.alternateEmail,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      country: formData.country,
      zipCode: formData.zipCode,
      linkedin: formData.linkedin,
      github: formData.github,
      twitter: formData.twitter,
      website: formData.website,
      workExperience: workExperience.map(({ id, ...rest }) => ({ id, ...rest })),
      educationDetails: educationDetails.map(({ id, ...rest }) => ({ id, ...rest })),
      dependentDetails: dependentDetails.map(({ id, ...rest }) => ({ id, ...rest })),
    }

    onSave(updated)
  }

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-hidden">
      {formError && (
        <div className="mx-6 mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {formError}
        </div>
      )}
      {/* Progress Indicator */}
      <div className="px-6 pt-4">
        <div className="flex items-center justify-between mb-4">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="flex flex-col items-center gap-2 flex-1 relative">
              <div
                className={cn(
                  "size-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 z-10",
                  currentStep >= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                {step}
              </div>
              <span className={cn(
                "text-[9px] font-bold uppercase tracking-wider transition-colors duration-300",
                currentStep >= step ? "text-foreground" : "text-muted-foreground"
              )}>
                {step === 1 ? "Profile" : step === 2 ? "Work Info" : step === 3 ? "Contact" : step === 4 ? "Social" : "History"}
              </span>
              {step < 5 && (
                <div className="absolute top-4 left-[60%] right-[-40%] h-[2px] bg-muted -z-0">
                  <div className="h-full bg-primary transition-all duration-500" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden px-1">
        <div className="h-full">
          <ScrollArea className="h-full px-5">
            <div className="space-y-8 py-4">
              {currentStep === 1 && (
                <div className="space-y-8">
                  <div className="flex gap-12 items-start mb-6">
                    <div className="flex-shrink-0">
                      <ProfileImageUpload
                        avatar={formData.avatar}
                        onAvatarChange={(url: string) => updateField("avatar", url)}
                      />
                    </div>
                    <div className="flex-1">
                      <BasicInfoSection formData={formData} onChange={updateField} />
                    </div>
                  </div>
                  <Separator />
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-8">
                  <WorkInfoSection formData={formData} onChange={updateField} />
                  <Separator />
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-8">
                  <ContactDetailsSection formData={formData} onChange={updateField} />
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
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-8">
                  <SocialPresenceSection formData={formData} onChange={updateField} />
                </div>
              )}

              {currentStep === 5 && (
                <div className="space-y-8 pb-8">
                  <DynamicRowSection
                    title="Work experience"
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
                  <Separator />
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
                  <Separator />
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
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/10">
        <Button variant="ghost" onClick={currentStep === 1 ? onCancel : prevStep}>
          {currentStep === 1 ? "Cancel" : "Back"}
        </Button>
        <div className="flex gap-3">
          {currentStep < 5 ? (
            <Button className="bg-primary hover:bg-primary/80 w-32" onClick={nextStep}>
              Next Step
            </Button>
          ) : (
            <Button className="bg-primary hover:bg-primary/80 w-32" onClick={handleSave}>
              Save Changes
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
