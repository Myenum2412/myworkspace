"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
} from "@/components/ui/dialog";
import { PlusIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { columns, type Client } from "./columns";
import { DataTable } from "./data-table";

export default function ClientsPage() {
  const [user, setUser] = useState({ name: "", email: "", avatar: "" });

  const [clients, setClients] = useState<Client[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    fetch("/api/clients", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setClients(Array.isArray(d) ? d : d.data || []))
      .catch(() => {});
  }, []);

  // Client Information
  const [clientName, setClientName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [clientType, setClientType] = useState("");
  const [industry, setIndustry] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");

  // Contact Information
  const [primaryContact, setPrimaryContact] = useState("");
  const [designation, setDesignation] = useState("");
  const [email, setEmail] = useState("");
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
  const [createdBy, setCreatedBy] = useState("");
  const [createdDate, setCreatedDate] = useState("");
  const [lastUpdatedDate, setLastUpdatedDate] = useState("");

  const steps = [
    { label: "Client Info" },
    { label: "Contact & Address" },
    { label: "Business" },
    { label: "Project" },
    { label: "Billing & Bank" },
    { label: "Preferences" },
    { label: "Additional" },
  ];

  function goToNext() {
    if (step < steps.length - 1) setStep(step + 1);
  }

  function goToPrev() {
    if (step > 0) setStep(step - 1);
  }

  useEffect(() => {
    fetch("/api/user/me", { credentials: "include" })
      .then((r) => r.json())
      .then((u) => setUser({ name: u.name || "User", email: u.email || "", avatar: u.image || "" }))
      .catch(() => {});
  }, []);

  function resetForm() {
    setStep(0);
    setClientName(""); setCompanyName(""); setClientType(""); setIndustry(""); setWebsiteUrl("");
    setPrimaryContact(""); setDesignation(""); setEmail(""); setMobileNumber(""); setAlternatePhone(""); setWhatsappNumber("");
    setAddressLine1(""); setAddressLine2(""); setCity(""); setStateProvince(""); setCountry(""); setPostalCode("");
    setGstNumber(""); setPanNumber(""); setCompanyRegNumber(""); setTaxId("");
    setProjectName(""); setServiceRequired(""); setProjectBudget(""); setExpectedStartDate(""); setExpectedEndDate("");
    setBillingContactName(""); setBillingEmail(""); setPaymentTerms(""); setCurrency(""); setCreditLimit("");
    setBankName(""); setAccountHolderName(""); setAccountNumber(""); setConfirmAccountNumber(""); setIfscCode(""); setBranchName(""); setAccountType(""); setUpiId("");
    setPreferredContactMethod(""); setPreferredTimeZone("");
    setStatus("");
    setSourceOfLead(""); setNotes("");
    setAssignedSalesPerson(""); setAssignedProjectManager(""); setCreatedBy(""); setCreatedDate(""); setLastUpdatedDate("");
  }

  async function handleSubmit() {
    if (!clientName || !email || !primaryContact) return;
    const payload = {
      name: clientName,
      email,
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
      assignedSalesPerson, assignedProjectManager, createdBy, createdDate, lastUpdatedDate,
    };
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const created = await res.json();
      setClients((prev) => [...prev, created]);
      setShowForm(false);
      resetForm();
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <Header />
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
                <div className="text-2xl font-bold text-emerald-500">
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
              <DataTable columns={columns} data={clients} />
            </CardContent>
          </Card>
        </main>

        <Dialog open={showForm} onOpenChange={(v) => { setShowForm(v); if (!v) setStep(0); }}>
          <DialogContent className="max-w-4xl w-full max-h-[85vh] min-h-[50vh] p-0 flex flex-col">
            <DialogHeader className="px-6 pt-6 pb-0 shrink-0 w-full">
              <DialogTitle>Add Client</DialogTitle>
              <DialogDescription>
                Fill in the details below to add a new client.
              </DialogDescription>
            </DialogHeader>

            {/* Step Indicator */}
            <div className="flex items-center gap-1 px-6 py-4 shrink-0 overflow-x-auto">
              {steps.map((s, i) => (
                <div key={i} className="flex items-center gap-1 min-w-0">
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      i === step
                        ? "bg-primary text-primary-foreground"
                        : i < step
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                    onClick={() => setStep(i)}
                  >
                    <span className={`flex items-center justify-center size-5 rounded-full text-[10px] font-bold ${
                      i === step
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : i < step
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted-foreground/20 text-muted-foreground"
                    }`}>
                      {i < step ? "✓" : i + 1}
                    </span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`h-px w-4 ${i < step ? "bg-primary" : "bg-border"}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Slide Content */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <div
                className="flex h-full transition-transform duration-300 ease-in-out"
                style={{ transform: `translateX(-${step * 100}%)` }}
              >
                {/* Slide 1 - Client Info */}
                <div className="min-w-full h-full overflow-y-auto px-6 pb-4 space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Client Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Client ID</Label>
                        <Input value="Auto Generated" disabled className="text-muted-foreground" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Client Name *</Label>
                        <Input placeholder="Enter client name" value={clientName} onChange={(e) => setClientName(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Company Name *</Label>
                        <Input placeholder="Enter company name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Client Type</Label>
                        <Select value={clientType} onValueChange={setClientType}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Individual">Individual</SelectItem>
                            <SelectItem value="Business">Business</SelectItem>
                            <SelectItem value="Government">Government</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Industry</Label>
                        <Input placeholder="Enter industry" value={industry} onChange={(e) => setIndustry(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Website URL</Label>
                        <Input placeholder="https://example.com" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Slide 2 - Contact & Address */}
                <div className="min-w-full h-full overflow-y-auto px-6 pb-4 space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Primary Contact Person *</Label>
                        <Input placeholder="Enter contact person" value={primaryContact} onChange={(e) => setPrimaryContact(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Designation</Label>
                        <Input placeholder="Enter designation" value={designation} onChange={(e) => setDesignation(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Email Address *</Label>
                        <Input placeholder="Enter email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Mobile Number *</Label>
                        <Input placeholder="Enter mobile number" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Alternate Phone Number</Label>
                        <Input placeholder="Enter alternate phone" value={alternatePhone} onChange={(e) => setAlternatePhone(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">WhatsApp Number</Label>
                        <Input placeholder="Enter WhatsApp number" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Address Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Address Line 1 *</Label>
                        <Input placeholder="Enter address" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Address Line 2</Label>
                        <Input placeholder="Enter address line 2" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">City *</Label>
                        <Input placeholder="Enter city" value={city} onChange={(e) => setCity(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">State/Province *</Label>
                        <Input placeholder="Enter state/province" value={stateProvince} onChange={(e) => setStateProvince(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Country *</Label>
                        <Input placeholder="Enter country" value={country} onChange={(e) => setCountry(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Postal Code *</Label>
                        <Input placeholder="Enter postal code" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Slide 4 - Business */}
                <div className="min-w-full h-full overflow-y-auto px-6 pb-4 space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Business Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">GST Number (Optional)</Label>
                        <Input placeholder="Enter GST number" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">PAN Number (Optional)</Label>
                        <Input placeholder="Enter PAN number" value={panNumber} onChange={(e) => setPanNumber(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Company Registration Number</Label>
                        <Input placeholder="Enter registration number" value={companyRegNumber} onChange={(e) => setCompanyRegNumber(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Tax ID</Label>
                        <Input placeholder="Enter tax ID" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Slide 5 - Project */}
                <div className="min-w-full h-full overflow-y-auto px-6 pb-4 space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Project Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Project Name</Label>
                        <Input placeholder="Enter project name" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Service Required</Label>
                        <Select value={serviceRequired} onValueChange={setServiceRequired}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
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
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Project Budget</Label>
                        <Input placeholder="Enter budget" value={projectBudget} onChange={(e) => setProjectBudget(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Expected Start Date</Label>
                        <Input type="date" value={expectedStartDate} onChange={(e) => setExpectedStartDate(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Expected End Date</Label>
                        <Input type="date" value={expectedEndDate} onChange={(e) => setExpectedEndDate(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Slide 5 - Billing & Bank */}
                <div className="min-w-full h-full overflow-y-auto px-6 pb-4 space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Billing Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Billing Contact Name</Label>
                        <Input placeholder="Enter billing contact" value={billingContactName} onChange={(e) => setBillingContactName(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Billing Email</Label>
                        <Input placeholder="Enter billing email" type="email" value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Payment Terms</Label>
                        <Input placeholder="Enter payment terms" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Currency</Label>
                        <Select value={currency} onValueChange={setCurrency}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="GBP">GBP</SelectItem>
                            <SelectItem value="INR">INR</SelectItem>
                            <SelectItem value="AED">AED</SelectItem>
                            <SelectItem value="AUD">AUD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Credit Limit</Label>
                        <Input placeholder="Enter credit limit" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Bank Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Bank Name</Label>
                        <Input placeholder="Enter bank name" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Account Holder Name</Label>
                        <Input placeholder="Enter account holder name" value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Account Number</Label>
                        <Input placeholder="Enter account number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Confirm Account Number</Label>
                        <Input placeholder="Re-enter account number" value={confirmAccountNumber} onChange={(e) => setConfirmAccountNumber(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">IFSC Code / Routing No.</Label>
                        <Input placeholder="Enter IFSC or routing number" value={ifscCode} onChange={(e) => setIfscCode(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Branch Name</Label>
                        <Input placeholder="Enter branch name" value={branchName} onChange={(e) => setBranchName(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Account Type</Label>
                        <Select value={accountType} onValueChange={setAccountType}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Savings">Savings</SelectItem>
                            <SelectItem value="Current">Current</SelectItem>
                            <SelectItem value="Business">Business</SelectItem>
                            <SelectItem value="Corporate">Corporate</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">UPI ID / PayPal Email</Label>
                        <Input placeholder="Enter UPI ID or PayPal email" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Slide 8 - Preferences & Status */}
                <div className="min-w-full h-full overflow-y-auto px-6 pb-4 space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Communication Preferences</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Preferred Contact Method</Label>
                        <Select value={preferredContactMethod} onValueChange={setPreferredContactMethod}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Email">Email</SelectItem>
                            <SelectItem value="Phone">Phone</SelectItem>
                            <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                            <SelectItem value="Teams">Teams</SelectItem>
                            <SelectItem value="Zoom">Zoom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Preferred Time Zone</Label>
                        <Input placeholder="Enter timezone (e.g. IST, EST, PST)" value={preferredTimeZone} onChange={(e) => setPreferredTimeZone(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Client Status</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Status</Label>
                        <Select value={status} onValueChange={setStatus}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Lead">Lead</SelectItem>
                            <SelectItem value="Prospect">Prospect</SelectItem>
                            <SelectItem value="Active Client">Active Client</SelectItem>
                            <SelectItem value="Inactive Client">Inactive Client</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Slide 9 - Additional & System */}
                <div className="min-w-full h-full overflow-y-auto px-6 pb-4 space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Additional Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Source of Lead</Label>
                        <Select value={sourceOfLead} onValueChange={setSourceOfLead}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Referral">Referral</SelectItem>
                            <SelectItem value="Website">Website</SelectItem>
                            <SelectItem value="Social Media">Social Media</SelectItem>
                            <SelectItem value="BNI">BNI</SelectItem>
                            <SelectItem value="Advertisement">Advertisement</SelectItem>
                            <SelectItem value="Direct Contact">Direct Contact</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Attachments/Documents</Label>
                        <Input type="file" className="file:text-xs file:font-medium" />
                      </div>
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
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">System Fields</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Assigned Sales Person</Label>
                        <Input placeholder="Sales person" value={assignedSalesPerson} onChange={(e) => setAssignedSalesPerson(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Assigned Project Manager</Label>
                        <Input placeholder="Project manager" value={assignedProjectManager} onChange={(e) => setAssignedProjectManager(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Created By</Label>
                        <Input placeholder="Created by" value={createdBy} onChange={(e) => setCreatedBy(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Created Date</Label>
                        <Input type="date" value={createdDate} onChange={(e) => setCreatedDate(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Last Updated Date</Label>
                        <Input type="date" value={lastUpdatedDate} onChange={(e) => setLastUpdatedDate(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t shrink-0">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <div className="flex items-center gap-2">
                {step > 0 && (
                  <Button variant="ghost" onClick={goToPrev}>
                    <ChevronLeft className="size-4 mr-1" />
                    Previous
                  </Button>
                )}
                {step < steps.length - 1 ? (
                  <Button onClick={goToNext}>
                    Next
                    <ChevronRight className="size-4 ml-1" />
                  </Button>
                ) : (
                  <Button disabled={!clientName || !email || !primaryContact} onClick={handleSubmit}>
                    Create Client
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
}
