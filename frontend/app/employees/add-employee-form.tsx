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
import { CopyIcon } from "lucide-react"

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
  SocialPresenceSection,
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
    { id: "1", company: "", title: "", from: "", to: "", description: "", relevant: false },
  ])
  const [educationDetails, setEducationDetails] = React.useState<Row[]>([
    { id: "1", institute: "", degree: "", specialization: "", completionDate: "" },
  ])
  const [dependentDetails, setDependentDetails] = React.useState<Row[]>([
    { id: "1", name: "", relationship: "", dob: "" },
  ])

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

  const createEmployeeMutation = useMutation({
    mutationFn: () => employeeService.createEmployee({
      firstName: firstSlideData.firstName.trim(),
      lastName: firstSlideData.lastName.trim(),
      email: firstSlideData.email.trim(),
      avatar: firstSlideData.avatar || "",
      department: firstSlideData.department || null,
      phone: firstSlideData.phone || null,
      alternateEmail: firstSlideData.secondaryPhone || null, // Mapping secondaryPhone to alternateEmail for now, or just using the schema
      address: firstSlideData.address || null,
      city: firstSlideData.city || null,
      state: firstSlideData.state || null,
      country: firstSlideData.country || null,
      zipCode: firstSlideData.postalCode || null,
      linkedin: firstSlideData.linkedin || null,
      github: firstSlideData.github || null,
      twitter: firstSlideData.twitter || null,
      website: firstSlideData.portfolio || null,
      roleName: firstSlideData.roleName || firstSlideData.designation || null,
      branchName: firstSlideData.branchName || firstSlideData.location || null,
      employmentType: firstSlideData.employmentType || null,
      status: firstSlideData.status.toLowerCase() === "inactive" ? "inactive" : "active",
      sourceOfHire: firstSlideData.sourceOfHire || null,
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
      setFormError(error?.message || "Failed to create employee. Please try again.")
    },
  })

  const [successModalOpen, setSuccessModalOpen] = React.useState(false)

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
        email: firstSlideData.email.trim(),
        avatar: firstSlideData.avatar || "",
        password: finalPassword,
        department: firstSlideData.department || null,
        phone: firstSlideData.phone || null,
        alternateEmail: firstSlideData.secondaryPhone || null,
        address: firstSlideData.address || null,
        city: firstSlideData.city || null,
        state: firstSlideData.state || null,
        country: firstSlideData.country || null,
        zipCode: firstSlideData.postalCode || null,
        linkedin: firstSlideData.linkedin || null,
        github: firstSlideData.github || null,
        twitter: firstSlideData.twitter || null,
        website: firstSlideData.portfolio || null,
        roleName: firstSlideData.roleName || firstSlideData.designation || null,
        branchName: firstSlideData.branchName || firstSlideData.location || null,
        employmentType: firstSlideData.employmentType || null,
        status: firstSlideData.status.toLowerCase() === "inactive" ? "inactive" : "active",
        sourceOfHire: firstSlideData.sourceOfHire || null,
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
      setSuccessModalOpen(true)
    } catch (err: any) {
      setFormError(err?.message || "Failed to create employee. Please try again.")
    }
  }

  const completeAndClose = () => {
    setSuccessModalOpen(false)
    if (savedEmployee) {
      onEmployeeAdded?.(savedEmployee)
      if (onCancel) onCancel()
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-hidden">
      <Dialog open={successModalOpen} onOpenChange={setSuccessModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Employee Created</DialogTitle>
            <DialogDescription>
              The account has been successfully created. Please securely share the following login credentials with the user.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 my-4 bg-muted/50 p-4 rounded-lg">
            <div className="grid flex-1 gap-2">
              <div className="text-sm">
                <span className="font-semibold">Email:</span> {firstSlideData.email}
              </div>
              <div className="text-sm">
                <span className="font-semibold">Password:</span> {firstSlideData.password}
              </div>
            </div>
            <Button size="sm" className="px-3" onClick={() => {
              navigator.clipboard.writeText(`Email: ${firstSlideData.email}\nPassword: ${firstSlideData.password}`)
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

      <div className="relative flex-1 overflow-hidden px-1">
        <ScrollArea className="h-full px-5">
          <div className="space-y-12 py-6 max-w-4xl mx-auto">
            
            {/* Step 1: Profile */}
            <div className="space-y-8">
              <div className="flex gap-12 items-start mb-6">
                <div className="flex-shrink-0">
                  <ProfileImageUpload 
                    avatar={firstSlideData.avatar} 
                    onAvatarChange={(url) => updateFirstSlideField("avatar", url)} 
                  />
                </div>
                <div className="flex-1">
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

            {/* Step 4: Social */}
            <div className="space-y-8">
              <SocialPresenceSection
                linkedin={firstSlideData.linkedin}
                github={firstSlideData.github}
                twitter={firstSlideData.twitter}
                portfolio={firstSlideData.portfolio}
                onLinkedinChange={(v) => updateFirstSlideField("linkedin", v)}
                onGithubChange={(v) => updateFirstSlideField("github", v)}
                onTwitterChange={(v) => updateFirstSlideField("twitter", v)}
                onPortfolioChange={(v) => updateFirstSlideField("portfolio", v)}
              />
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
                      <Input placeholder="Company name" />
                    </Field>
                    <Field>
                      <FieldLabel>Job Title</FieldLabel>
                      <Input placeholder="Job Title" />
                    </Field>
                    <Field>
                      <FieldLabel>From Date</FieldLabel>
                      <Input type="date" />
                    </Field>
                    <Field>
                      <FieldLabel>To Date</FieldLabel>
                      <Input type="date" />
                    </Field>
                    <Field className="sm:col-span-2">
                      <FieldLabel>Job Description</FieldLabel>
                      <textarea className="min-h-[60px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring" placeholder="Job Description" />
                    </Field>
                    <div className="flex items-center gap-2">
                      <Checkbox id={`relevant-${row.id}`} />
                      <label htmlFor={`relevant-${row.id}`} className="text-sm font-medium">Relevant</label>
                    </div>
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
                      <Input placeholder="Institute Name" />
                    </Field>
                    <Field>
                      <FieldLabel>Degree/Diploma</FieldLabel>
                      <Input placeholder="Degree/Diploma" />
                    </Field>
                    <Field>
                      <FieldLabel>Specialization</FieldLabel>
                      <Input placeholder="Specialization" />
                    </Field>
                    <Field>
                      <FieldLabel>Date of Completion</FieldLabel>
                      <Input type="date" />
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
                      <Input placeholder="Name" />
                    </Field>
                    <SelectWithAdd
                      label="Relationship"
                      options={["Spouse", "Child", "Parent"]}
                    />
                    <Field>
                      <FieldLabel>Date of Birth</FieldLabel>
                      <Input type="date" />
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
        <div className="flex gap-3">
          <Button className="bg-primary hover:bg-primary/80 w-32" onClick={handleSave} disabled={createEmployeeMutation.isPending}>
            {createEmployeeMutation.isPending ? "Saving..." : "Save Employee"}
          </Button>
        </div>
      </div>
    </div>
  )
}
