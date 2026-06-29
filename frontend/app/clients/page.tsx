"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Field,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field";
import { PlusIcon, Loader2, CheckCircle2, Copy, Eye, EyeOff, RefreshCw, AlertCircle, X, Trash2, FolderOpen, FileText } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { INDUSTRIES } from "@/lib/industries";
import { columns, makeActionsCell, type Client } from "./columns";
import { DataTable } from "./data-table";
import { getSocketIO } from "@/lib/socketio-client";
import {
  ClientValues,
  EMPTY_VALUES,
  valuesFromClient,
  payloadFromValues,
  CreateClientFormFields,
  EditClientFormFields,
} from "./client-form-fields";

type Credentials = {
  username: string;
  email: string;
  password: string;
  loginUrl: string;
};

export default function ClientsPage() {
  const router = useRouter();
  const [user, setUser] = useState({ name: "", email: "", avatar: "" });

  const [clients, setClients] = useState<Client[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    fetch("/api/clients", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const arr = Array.isArray(d) ? d : d.data || [];
        if (arr.length > 0) setClients(arr);
      })
      .catch((error) => {
        console.error("[CLIENTS] Failed to fetch clients:", error);
      });
  }, []);

  // Live updates from other clients (own create is optimistic in the form).
  useEffect(() => {
    let alive = true;
    const sock: any = getSocketIO();
    sock.on("client:created", (d: any) => {
      const c = d?.payload ?? d;
      setClients((prev) => (prev.some((x) => x.id === c.id) ? prev : [c, ...prev]));
    });
    sock.on("client:updated", (d: any) => {
      const c = d?.payload ?? d;
      setClients((prev) => prev.map((x) => (x.id === c.id ? { ...x, ...c } : x)));
    });
    sock.on("client:deleted", (d: any) => {
      const { id } = d?.payload ?? d;
      setClients((prev) => prev.filter((x) => x.id !== id));
    });
    return () => {
      alive = false;
      if (sock) {
        sock.off("client:created");
        sock.off("client:updated");
        sock.off("client:deleted");
      }
    };
  }, []);

  // Client Information
  const [clientName, setClientName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [clientType, setClientType] = useState("");
  const [industry, setIndustry] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [email, setEmail] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");

  function generateRandomPassword(length = 12) {
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lower = "abcdefghijklmnopqrstuvwxyz";
    const digits = "0123456789";
    const special = "!@#$%^&*";
    const all = upper + lower + digits + special;
    let pwd = "";
    pwd += upper[Math.floor(Math.random() * upper.length)];
    pwd += lower[Math.floor(Math.random() * lower.length)];
    pwd += digits[Math.floor(Math.random() * digits.length)];
    pwd += special[Math.floor(Math.random() * special.length)];
    for (let i = 4; i < length; i++) {
      pwd += all[Math.floor(Math.random() * all.length)];
    }
    return pwd.split("").sort(() => Math.random() - 0.5).join("");
  }

  useEffect(() => {
    setGeneratedPassword(generateRandomPassword());
  }, []);

  // Contact Information
  const [primaryContact, setPrimaryContact] = useState("");
  const [designation, setDesignation] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");

  // Address Details
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [country, setCountry] = useState("");
  const [postalCode, setPostalCode] = useState("");

  // Business Details
  const [gstNumber, setGstNumber] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [companyRegNumber, setCompanyRegNumber] = useState("");
  const [taxId, setTaxId] = useState("");

  // Project Information
  const [projectName, setProjectName] = useState("");
  const [serviceRequired, setServiceRequired] = useState("");
  const [projectBudget, setProjectBudget] = useState("");
  const [expectedStartDate, setExpectedStartDate] = useState("");
  const [expectedEndDate, setExpectedEndDate] = useState("");

  // Billing Information
  const [billingContactName, setBillingContactName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [currency, setCurrency] = useState("");
  const [creditLimit, setCreditLimit] = useState("");

  // Bank Details
  const [bankName, setBankName] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [branchName, setBranchName] = useState("");
  const [accountType, setAccountType] = useState("");
  const [upiId, setUpiId] = useState("");

  // Communication Preferences
  const [preferredContactMethod, setPreferredContactMethod] = useState("");
  const [preferredTimeZone, setPreferredTimeZone] = useState("");

  // Client Status
  const [status, setStatus] = useState("");

  // Additional Information
  const [sourceOfLead, setSourceOfLead] = useState("");
  const [notes, setNotes] = useState("");

  // System Fields
  const [assignedSalesPerson, setAssignedSalesPerson] = useState("");
  const [assignedProjectManager, setAssignedProjectManager] = useState("");
  const [members, setMembers] = useState<string[]>([]);

  // Edit
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editValues, setEditValues] = useState<ClientValues>(EMPTY_VALUES);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [editApiError, setEditApiError] = useState("");
  const setEdit = (key: string, value: string) =>
    setEditValues((prev) => ({ ...prev, [key]: value }));

  // Delete
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    fetch("/api/user/me", { credentials: "include" })
      .then((r) => r.json())
      .then((u) => setUser({ name: u.name || "User", email: u.email || "", avatar: u.image || "" }))
      .catch((error) => {
        console.error("[CLIENTS] Failed to fetch user:", error);
      });
    fetch("/api/employees", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const arr = Array.isArray(d) ? d : d.data || [];
        const names = arr.map((e: Record<string, unknown>) => e.name as string).filter(Boolean);
        setMembers(names);
      })
      .catch(() => { });
  }, []);

  function resetForm() {
    setClientName(""); setCompanyName(""); setClientType(""); setIndustry(""); setWebsiteUrl("");
    setEmail(""); setGeneratedPassword(generateRandomPassword());
    setPrimaryContact(""); setDesignation(""); setMobileNumber(""); setAlternatePhone(""); setWhatsappNumber("");
    setAddressLine1(""); setAddressLine2(""); setCity(""); setStateProvince(""); setCountry(""); setPostalCode("");
    setGstNumber(""); setPanNumber(""); setCompanyRegNumber(""); setTaxId("");
    setProjectName(""); setServiceRequired(""); setProjectBudget(""); setExpectedStartDate(""); setExpectedEndDate("");
    setBillingContactName(""); setBillingEmail(""); setPaymentTerms(""); setCurrency(""); setCreditLimit("");
    setBankName(""); setAccountHolderName(""); setAccountNumber(""); setConfirmAccountNumber(""); setIfscCode(""); setBranchName(""); setAccountType(""); setUpiId("");
    setPreferredContactMethod(""); setPreferredTimeZone("");
    setStatus("");
    setSourceOfLead(""); setNotes("");
    setAssignedSalesPerson(""); setAssignedProjectManager("");
    setFormErrors({});
    setApiError("");
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!clientName.trim()) errors.name = "Client name is required";
    if (!email.trim()) errors.email = "Email address is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Invalid email format";
    if (!primaryContact.trim()) errors.primaryContact = "Primary contact is required";
    if (!companyName.trim()) errors.company = "Company name is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    setApiError("");
    const payload = {
      name: clientName,
      email,
      password: generatedPassword,
      company: companyName,
      projects: 0,
      status,
      clientType, industry, websiteUrl,
      primaryContact, designation, mobileNumber, alternatePhone, whatsappNumber,
      addressLine1, addressLine2, city, stateProvince, country, postalCode,
      gstNumber, panNumber, companyRegNumber, taxId,
      projectName, serviceRequired, projectBudget, expectedStartDate, expectedEndDate,
      billingContactName, billingEmail, paymentTerms, currency, creditLimit,
      bankName, accountHolderName, accountNumber, confirmAccountNumber, ifscCode, branchName, accountType, upiId,
      preferredContactMethod, preferredTimeZone,
      sourceOfLead, notes,
      assignedSalesPerson, assignedProjectManager,
    };
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (res.ok) {
      const created = result.data?.client || result;
      setClients((prev) => [...prev, created]);
      if (result.data?.credentials) {
        setCredentials(result.data.credentials);
        setShowSuccess(true);
      }
      setShowForm(false);
      resetForm();
      router.push(result.data?.workspaceUrl || `/clients/${created.id}`);
    } else {
      if (result.fields) {
        setFormErrors(result.fields);
      }
      setApiError(result.error || "Failed to create client");
    }
    setSaving(false);
  }

  function handleCloseForm(open: boolean) {
    setShowForm(open);
    if (!open) resetForm();
  }

  function handleStartEdit(client: Client) {
    setEditingClient(client);
    setEditValues(valuesFromClient(client as unknown as Record<string, unknown>));
    setEditErrors({});
    setEditApiError("");
  }

  function handleCloseEdit(open: boolean) {
    setEditingClient(open ? editingClient : null);
    if (!open) {
      setEditValues(EMPTY_VALUES);
      setEditErrors({});
      setEditApiError("");
    }
  }

  async function handleEditSubmit() {
    if (!editingClient) return;
    setEditSaving(true);
    setEditApiError("");
    setEditErrors({});
    const res = await fetch(`/api/clients/${encodeURIComponent(editingClient.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payloadFromValues(editValues)),
    });
    const result = await res.json().catch(() => ({}));
    if (res.ok) {
      const updated = result.data || result;
      setClients((prev) => prev.map((c) => (c.id === editingClient.id ? { ...c, ...updated } : c)));
      handleCloseEdit(false);
    } else {
      if (result.fields) setEditErrors(result.fields);
      setEditApiError(result.error || "Failed to update client");
    }
    setEditSaving(false);
  }

  async function handleDeleteConfirm() {
    if (!deletingClient) return;
    setDeleteError("");
    const res = await fetch(`/api/clients/${encodeURIComponent(deletingClient.id)}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      const result = await res.json().catch(() => ({}));
      const deletedId = result?.id || deletingClient.id;
      setClients((prev) => prev.filter((c) => c.id !== deletedId));
      setDeletingClient(null);
    } else {
      const result = await res.json().catch(() => ({}));
      setDeleteError(result.error || "Failed to delete client");
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  }

  function fieldClass(fieldName: string): string {
    return formErrors[fieldName]
      ? "border-red-500 focus-visible:ring-red-400"
      : "";
  }

  function fieldError(fieldName: string): string | null {
    return formErrors[fieldName] || null;
  }

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Clients</h1>
          <Button onClick={() => setShowForm(true)}>
            <PlusIcon className="mr-2 size-4" />
            Add Client
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Clients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clients.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {clients.filter((c) => c.status === "Active Client").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Inactive / Lead</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {clients.filter((c) => c.status === "Inactive Client" || c.status === "Lead").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {clients.reduce((acc, c) => acc + c.projects, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client List</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={[...columns, makeActionsCell(handleStartEdit, (c) => { setDeletingClient(c); setDeleteError(""); })]}
              data={clients}
            />
          </CardContent>
        </Card>
      </main>

      <Dialog open={showForm} onOpenChange={handleCloseForm}>
        <DialogContent className="max-w-screen-xl w-full min-w-[95vw] max-h-[95vh] h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0 w-full">
            <DialogTitle>Add Client</DialogTitle>
            <DialogDescription>
              Fill in the details below to add a new client. An account will be created and credentials sent via email.
            </DialogDescription>
          </DialogHeader>

          {apiError && (
            <div className="px-6">
              <div className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 p-4">
                <AlertCircle className="size-5 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">{apiError}</p>
                  {Object.keys(formErrors).length > 0 && (
                    <ul className="mt-1 text-xs text-red-600 list-disc list-inside">
                      {Object.entries(formErrors).map(([key, msg]) => (
                        <li key={key}>{key}: {msg}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <button onClick={() => setApiError("")} className="shrink-0 text-destructive hover:text-destructive">
                  <X className="size-4" />
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 px-6 pb-6 min-h-0 overflow-hidden">
            <ScrollArea className="h-full">

              <FieldSet>
                <FieldLegend>Client Information</FieldLegend>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field>
                    <Label className="text-xs text-muted-foreground">Client ID</Label>
                    <Input value="Auto Generated" disabled className="text-muted-foreground" />
                  </Field>
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Client Name *</Label>
                    <Input placeholder="Enter client name" value={clientName} onChange={(e) => setClientName(e.target.value)} className={fieldClass("name")} />
                    {fieldError("name") && <p className="text-xs text-red-500 mt-1">{fieldError("name")}</p>}
                  </Field>
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Company Name *</Label>
                    <Input placeholder="Enter company name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={fieldClass("company")} />
                    {fieldError("company") && <p className="text-xs text-red-500 mt-1">{fieldError("company")}</p>}
                  </Field>
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Email Address *</Label>
                    <Input placeholder="client@company.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass("email")} />
                    {fieldError("email") && <p className="text-xs text-red-500 mt-1">{fieldError("email")}</p>}
                  </Field>
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Generated Password</Label>
                    <div className="flex gap-2">
                      <Input value={generatedPassword} readOnly className="font-mono text-xs flex-1" />
                      <Button type="button" variant="outline" size="icon" className="size-9 shrink-0"
                        onClick={() => setGeneratedPassword(generateRandomPassword())}
                        title="Regenerate password">
                        <RefreshCw className="size-4" />
                      </Button>
                    </div>
                  </Field>
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Client Type</Label>
                    <Select value={clientType} onValueChange={setClientType}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Individual">Individual</SelectItem>
                        <SelectItem value="Business">Business</SelectItem>
                        <SelectItem value="Government">Government</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <SearchableSelect
                      id="client-industry"
                      label="Industry"
                      options={INDUSTRIES}
                      value={industry}
                      onValueChange={setIndustry}
                      placeholder="Select industry"
                    />
                  </Field>
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Website URL</Label>
                    <Input placeholder="https://example.com" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
                  </Field>
                </div>
              </FieldSet>

              <Separator />

              <FieldSet>
                <FieldLegend>Contact Information</FieldLegend>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Primary Contact Person *</Label>
                    <Input placeholder="Enter contact person" value={primaryContact} onChange={(e) => setPrimaryContact(e.target.value)} className={fieldClass("primaryContact")} />
                    {fieldError("primaryContact") && <p className="text-xs text-red-500 mt-1">{fieldError("primaryContact")}</p>}
                  </Field>
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Designation</Label>
                    <Input placeholder="Enter designation" value={designation} onChange={(e) => setDesignation(e.target.value)} />
                  </Field>
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Mobile Number *</Label>
                    <Input placeholder="Enter mobile number" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} />
                  </Field>
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Alternate Phone Number</Label>
                    <Input placeholder="Enter alternate phone" value={alternatePhone} onChange={(e) => setAlternatePhone(e.target.value)} />
                  </Field>
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">WhatsApp Number</Label>
                    <Input placeholder="Enter WhatsApp number" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} />
                  </Field>
                </div>
              </FieldSet>

              <Separator />

              <FieldSet>
                <FieldLegend>Address Details</FieldLegend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Address Line 1 *</Label>
                    <Input placeholder="Enter address" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
                  </Field>
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Address Line 2</Label>
                    <Input placeholder="Enter address line 2" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
                  </Field>
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">City *</Label>
                    <Input placeholder="Enter city" value={city} onChange={(e) => setCity(e.target.value)} />
                  </Field>
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">State/Province *</Label>
                    <Input placeholder="Enter state/province" value={stateProvince} onChange={(e) => setStateProvince(e.target.value)} />
                  </Field>
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Country *</Label>
                    <Input placeholder="Enter country" value={country} onChange={(e) => setCountry(e.target.value)} />
                  </Field>
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Postal Code *</Label>
                    <Input placeholder="Enter postal code" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
                  </Field>
                </div>
              </FieldSet>

              <Separator />

              <FieldSet>
                <FieldLegend>Business Details</FieldLegend>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">GST Number</Label>
                    <Input placeholder="Enter GST number" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />
                  </Field>
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">PAN Number</Label>
                    <Input placeholder="Enter PAN number" value={panNumber} onChange={(e) => setPanNumber(e.target.value)} />
                  </Field>
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Company Registration Number</Label>
                    <Input placeholder="Enter registration number" value={companyRegNumber} onChange={(e) => setCompanyRegNumber(e.target.value)} />
                  </Field>
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Tax ID</Label>
                    <Input placeholder="Enter tax ID" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
                  </Field>
                </div>
              </FieldSet>

              <Separator />

              <FieldSet>
                <FieldLegend>Project Information</FieldLegend>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Project Name</Label>
                    <Input placeholder="Enter project name" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
                  </Field>
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Service Required</Label>
                    <Select value={serviceRequired} onValueChange={setServiceRequired}>
                      <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Website Development">Website Development</SelectItem>
                        <SelectItem value="Mobile App Development">Mobile App Development</SelectItem>
                        <SelectItem value="Digital Marketing">Digital Marketing</SelectItem>
                        <SelectItem value="SEO">SEO</SelectItem>
                        <SelectItem value="Branding">Branding</SelectItem>
                        <SelectItem value="Graphic Design">Graphic Design</SelectItem>
                        <SelectItem value="Custom Software">Custom Software</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Project Budget</Label>
                    <Input placeholder="Enter budget" value={projectBudget} onChange={(e) => setProjectBudget(e.target.value)} />
                  </Field>
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Expected Start Date</Label>
                    <Input type="date" value={expectedStartDate} onChange={(e) => setExpectedStartDate(e.target.value)} />
                  </Field>
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Expected End Date</Label>
                    <Input type="date" value={expectedEndDate} onChange={(e) => setExpectedEndDate(e.target.value)} />
                  </Field>
                </div>
              </FieldSet>

              <Separator />

              <FieldSet>
                <FieldLegend>Billing Information</FieldLegend>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Billing Contact Name</Label>
                    <Input placeholder="Enter billing contact" value={billingContactName} onChange={(e) => setBillingContactName(e.target.value)} />
                  </Field>
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Billing Email</Label>
                    <Input placeholder="Enter billing email" type="email" value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} />
                  </Field>
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Payment Terms</Label>
                    <Input placeholder="Enter payment terms" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
                  </Field>
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="INR">INR</SelectItem>
                        <SelectItem value="AED">AED</SelectItem>
                        <SelectItem value="AUD">AUD</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Credit Limit</Label>
                    <Input placeholder="Enter credit limit" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} />
                  </Field>
                </div>
              </FieldSet>

              <Separator />

              <FieldSet>
                <FieldLegend>Bank Details</FieldLegend>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Bank Name</Label>
                    <Input placeholder="Enter bank name" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                  </Field>
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Account Holder Name</Label>
                    <Input placeholder="Enter account holder name" value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} />
                  </Field>
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Account Number</Label>
                    <Input placeholder="Enter account number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
                  </Field>
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Confirm Account Number</Label>
                    <Input placeholder="Re-enter account number" value={confirmAccountNumber} onChange={(e) => setConfirmAccountNumber(e.target.value)} />
                  </Field>
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">IFSC Code / Routing No.</Label>
                    <Input placeholder="Enter IFSC or routing number" value={ifscCode} onChange={(e) => setIfscCode(e.target.value)} />
                  </Field>
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Branch Name</Label>
                    <Input placeholder="Enter branch name" value={branchName} onChange={(e) => setBranchName(e.target.value)} />
                  </Field>
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Account Type</Label>
                    <Select value={accountType} onValueChange={setAccountType}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Savings">Savings</SelectItem>
                        <SelectItem value="Current">Current</SelectItem>
                        <SelectItem value="Business">Business</SelectItem>
                        <SelectItem value="Corporate">Corporate</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">UPI ID / PayPal Email</Label>
                    <Input placeholder="Enter UPI ID or PayPal email" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
                  </Field>
                </div>
              </FieldSet>

              <Separator />

              <FieldSet>
                <FieldLegend>Communication Preferences</FieldLegend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Preferred Contact Method</Label>
                    <Select value={preferredContactMethod} onValueChange={setPreferredContactMethod}>
                      <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Email">Email</SelectItem>
                        <SelectItem value="Phone">Phone</SelectItem>
                        <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                        <SelectItem value="Teams">Teams</SelectItem>
                        <SelectItem value="Zoom">Zoom</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Preferred Time Zone</Label>
                    <Input placeholder="e.g. IST, EST, PST" value={preferredTimeZone} onChange={(e) => setPreferredTimeZone(e.target.value)} />
                  </Field>
                </div>
              </FieldSet>

              <Separator />

              <FieldSet>
                <FieldLegend>Client Status</FieldLegend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Lead">Lead</SelectItem>
                        <SelectItem value="Prospect">Prospect</SelectItem>
                        <SelectItem value="Active Client">Active Client</SelectItem>
                        <SelectItem value="Inactive Client">Inactive Client</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </FieldSet>

              <Separator />

              <FieldSet>
                <FieldLegend>Additional Information</FieldLegend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Source of Lead</Label>
                    <Select value={sourceOfLead} onValueChange={setSourceOfLead}>
                      <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Referral">Referral</SelectItem>
                        <SelectItem value="Website">Website</SelectItem>
                        <SelectItem value="Social Media">Social Media</SelectItem>
                        <SelectItem value="BNI">BNI</SelectItem>
                        <SelectItem value="Advertisement">Advertisement</SelectItem>
                        <SelectItem value="Direct Contact">Direct Contact</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field />
                </div>
                <div className="mt-4">
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Notes</Label>
                  <textarea
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]"
                    placeholder="Enter notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </FieldSet>

              <Separator />

              <FieldSet>
                <FieldLegend>System Fields</FieldLegend>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Assigned Sales Person</Label>
                    <Select value={assignedSalesPerson} onValueChange={setAssignedSalesPerson}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sales person" />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Assigned Project Manager</Label>
                    <Select value={assignedProjectManager} onValueChange={setAssignedProjectManager}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project manager" />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </FieldSet>
            </ScrollArea>
          </div>

          <DialogFooter className="flex items-center justify-between px-6 py-4 border-t shrink-0">
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={handleSubmit}>
              {saving ? <><Loader2 className="mr-2 size-4 animate-spin" /> Creating...</> : "Create Client & Send Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-6 text-primary" />
              Client Created Successfully
            </DialogTitle>
            <DialogDescription>
              A welcome email has been sent to {credentials?.email}. Share these credentials with the client.
            </DialogDescription>
          </DialogHeader>

          {credentials && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Login URL</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 rounded bg-muted px-2 py-1 text-sm break-all">{credentials.loginUrl}</code>
                    <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => copyToClipboard(credentials.loginUrl, "url")}>
                      <Copy className="size-4" />
                    </Button>
                  </div>
                  {copied === "url" && <span className="text-xs text-red-500 mt-1 block">Copied!</span>}
                </div>

                <Separator />

                <div>
                  <Label className="text-xs text-muted-foreground">Username / Email</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 rounded bg-muted px-2 py-1 text-sm">{credentials.email}</code>
                    <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => copyToClipboard(credentials.email, "email")}>
                      <Copy className="size-4" />
                    </Button>
                  </div>
                  {copied === "email" && <span className="text-xs text-red-500 mt-1 block">Copied!</span>}
                </div>

                <Separator />

                <div>
                  <Label className="text-xs text-muted-foreground">Temporary Password</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 rounded bg-muted px-2 py-1 text-sm">
                      {showPassword ? credentials.password : "••••••••••••"}
                    </code>
                    <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => copyToClipboard(credentials.password, "password")}>
                      <Copy className="size-4" />
                    </Button>
                  </div>
                  {copied === "password" && <span className="text-xs text-red-500 mt-1 block">Copied!</span>}
                </div>
              </div>

              <div className="rounded-lg bg-gray-100 border-border p-3">
                <p className="text-xs text-gray-700">
                  <strong>Note:</strong> The client will be required to change this password on first login.
                  An email with these credentials has been sent to {credentials.email}.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowSuccess(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit client */}
      <Dialog open={!!editingClient} onOpenChange={handleCloseEdit}>
        <DialogContent className="max-w-screen-xl w-full min-w-[95vw] max-h-[95vh] h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0 w-full">
            <DialogTitle>Edit Client{editingClient ? ` — ${editingClient.name}` : ""}</DialogTitle>
            <DialogDescription>Update the details below. Changes are saved immediately.</DialogDescription>
          </DialogHeader>

          {editApiError && (
            <div className="px-6">
              <div className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 p-4">
                <AlertCircle className="size-5 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">{editApiError}</p>
                  {Object.keys(editErrors).length > 0 && (
                    <ul className="mt-1 text-xs text-red-600 list-disc list-inside">
                      {Object.entries(editErrors).map(([key, msg]) => (
                        <li key={key}>{key}: {msg}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <button onClick={() => setEditApiError("")} className="shrink-0 text-destructive hover:text-destructive">
                  <X className="size-4" />
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 px-6 pb-6 min-h-0 overflow-hidden">
            <ScrollArea className="h-full">
              <EditClientFormFields v={editValues} set={setEdit} errors={editErrors} members={members} />
            </ScrollArea>
          </div>

          <DialogFooter className="flex items-center justify-between px-6 py-4 border-t shrink-0">
            <Button variant="outline" onClick={() => handleCloseEdit(false)}>Cancel</Button>
            <Button disabled={editSaving} onClick={handleEditSubmit}>
              {editSaving ? <><Loader2 className="mr-2 size-4 animate-spin" /> Saving...</> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deletingClient} onOpenChange={(o) => { if (!o) setDeletingClient(null); }}>
        <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-gradient-to-br from-red-500/10 via-background to-background p-6">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-100/80 ring-8 ring-red-50 mb-6 dark:bg-red-500/20 dark:ring-red-500/10">
              <Trash2 className="size-7 text-red-600 dark:text-red-400" />
            </div>

            <DialogHeader>
              <DialogTitle className="text-center text-2xl font-bold tracking-tight">
                Delete Client
              </DialogTitle>
              <DialogDescription className="text-center pt-2 text-base">
                {deletingClient ? (
                  <>Are you sure you want to permanently remove <strong className="text-foreground">{deletingClient.name}</strong> ({deletingClient.company})?</>
                ) : "Are you sure you want to permanently remove this client?"}
              </DialogDescription>
            </DialogHeader>

            {deletingClient && (
              <div className="mt-6 space-y-3 rounded-xl border border-border bg-card/50 p-4 shadow-sm backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
                    <FolderOpen className="size-4 text-primary" />
                  </div>
                  <div className="text-sm font-medium">All associated projects</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
                    <FileText className="size-4 text-primary" />
                  </div>
                  <div className="text-sm font-medium">Files and documents</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-md bg-red-500/10">
                    <AlertCircle className="size-4 text-red-600" />
                  </div>
                  <div className="text-sm font-medium text-red-600">Client-user access revoked</div>
                </div>
              </div>
            )}

            {deleteError && (
              <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="size-4" />
                {deleteError}
              </div>
            )}
          </div>

          <DialogFooter className="bg-muted/50 p-4 flex sm:justify-between border-t border-border/50 gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setDeletingClient(null)}
              className="w-full sm:w-auto hover:bg-background"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              className="w-full sm:w-auto shadow-md hover:shadow-lg transition-all active:scale-95 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400"
            >
              <Trash2 className="mr-2 size-4" />
              Yes, delete client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
