"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Client } from "@/app/clients/columns";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

export default function AddClientPage() {
  const router = useRouter();
  const [user, setUser] = useState({ name: "", email: "", avatar: "" });

  // Client Information
  const [clientName, setClientName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [clientType, setClientType] = useState("Individual");
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
  const [serviceRequired, setServiceRequired] = useState("Website Development");
  const [projectBudget, setProjectBudget] = useState("");
  const [expectedStartDate, setExpectedStartDate] = useState("");
  const [expectedEndDate, setExpectedEndDate] = useState("");

  // Billing Information
  const [billingContactName, setBillingContactName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [creditLimit, setCreditLimit] = useState("");

  // Communication Preferences
  const [preferredContactMethod, setPreferredContactMethod] = useState("Email");
  const [preferredTimeZone, setPreferredTimeZone] = useState("");

  // Client Status
  const [status, setStatus] = useState("Lead");

  // Additional Information
  const [sourceOfLead, setSourceOfLead] = useState("Referral");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((u) => setUser({ name: u.name || "User", email: u.email || "", avatar: u.image || "" }))
      .catch(() => {});
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !email || !primaryContact) return;
    const newClient: Client = {
      id: Date.now().toString(),
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
      preferredContactMethod, preferredTimeZone,
      sourceOfLead, notes,
    };
    const stored = JSON.parse(localStorage.getItem("clients") || "[]");
    stored.push(newClient);
    localStorage.setItem("clients", JSON.stringify(stored));
    router.push("/clients");
  };

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4">
          <h1 className="text-2xl font-bold">Add Client</h1>

          <Card>
            <CardHeader>
              <CardTitle>Client Details</CardTitle>
              <CardDescription>Enter the details for the new client</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Client Information */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Client Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Client ID</Label>
                      <Input value="Auto Generated" disabled className="text-muted-foreground" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Client Name *</Label>
                      <Input placeholder="Enter client name" value={clientName} onChange={(e) => setClientName(e.target.value)} required />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Company Name *</Label>
                      <Input placeholder="Enter company name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
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

                <Separator />

                {/* Contact Information */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Primary Contact Person *</Label>
                      <Input placeholder="Enter contact person" value={primaryContact} onChange={(e) => setPrimaryContact(e.target.value)} required />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Designation</Label>
                      <Input placeholder="Enter designation" value={designation} onChange={(e) => setDesignation(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Email Address *</Label>
                      <Input placeholder="Enter email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Mobile Number *</Label>
                      <Input placeholder="Enter mobile number" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} required />
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

                {/* Address Details */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Address Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Address Line 1 *</Label>
                      <Input placeholder="Enter address" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} required />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Address Line 2</Label>
                      <Input placeholder="Enter address line 2" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">City *</Label>
                      <Input placeholder="Enter city" value={city} onChange={(e) => setCity(e.target.value)} required />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">State/Province *</Label>
                      <Input placeholder="Enter state/province" value={stateProvince} onChange={(e) => setStateProvince(e.target.value)} required />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Country *</Label>
                      <Input placeholder="Enter country" value={country} onChange={(e) => setCountry(e.target.value)} required />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Postal Code *</Label>
                      <Input placeholder="Enter postal code" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} required />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Business Details */}
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

                <Separator />

                {/* Project Information */}
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

                <Separator />

                {/* Billing Information */}
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

                {/* Communication Preferences */}
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

                {/* Client Status */}
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

                <Separator />

                {/* Additional Information */}
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

                {/* System Fields */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">System Fields</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Assigned Sales Person</Label>
                      <Input placeholder="Sales person" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Assigned Project Manager</Label>
                      <Input placeholder="Project manager" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Created By</Label>
                      <Input placeholder="Created by" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Created Date</Label>
                      <Input type="date" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Last Updated Date</Label>
                      <Input type="date" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button type="button" variant="outline" onClick={() => router.push("/clients")}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Client</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
