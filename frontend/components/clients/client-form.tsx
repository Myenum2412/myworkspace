"use client"
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
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
import { Checkbox } from "@/components/ui/checkbox";
import { PincodeInput, LocationSelect } from "@/components/ui/location-fields";
import {
  Field,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api";
import { Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import type { Client } from "@/app/clients/columns";
import type { Credentials } from "@/components/clients/client-types";

const SALUTATIONS = ["Mr.", "Ms.", "Mrs.", "Dr.", "Prof."];
const GST_TREATMENTS = [
  "Registered Regular",
  "Registered Composition",
  "Unregistered",
  "Consumer",
  "UIN Holders",
  "Overseas",
  "SEZ",
];
const COUNTRIES = ["India", "United States", "United Kingdom", "Canada", "Australia", "Germany", "France", "UAE"];
const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir",
  "Ladakh", "Lakshadweep", "Puducherry",
];

type ContactPerson = {
  id: string;
  salutation: string;
  firstName: string;
  lastName: string;
  email: string;
  workPhone: string;
  mobile: string;
};

type ClientFormProps = {
  onCancel?: () => void;
  onClientAdded?: (client: Record<string, unknown>) => void;
};

export function ClientForm({ onCancel, onClientAdded }: ClientFormProps) {
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [pincodeResult, setPincodeResult] = useState<{cities: string[]; states: string[]; countries: string[]} | null>(null);
  const [apiError, setApiError] = useState("");
  const [activeTab, setActiveTab] = useState("other-details");

  const [customerType, setCustomerType] = useState("");
  const [salutation, setSalutation] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [workPhone, setWorkPhone] = useState("");
  const [mobile, setMobile] = useState("");

  const [gstTreatment, setGstTreatment] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [taxPreference, setTaxPreference] = useState("Taxable");
  const [paymentTerms, setPaymentTerms] = useState("Due on Receipt");
  const [portalAccess, setPortalAccess] = useState(false);
  const [documents, setDocuments] = useState<File[]>([]);

  const [billingAttention, setBillingAttention] = useState("");
  const [billingCountry, setBillingCountry] = useState("");
  const [billingStreet1, setBillingStreet1] = useState("");
  const [billingStreet2, setBillingStreet2] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingState, setBillingState] = useState("");
  const [billingPinCode, setBillingPinCode] = useState("");
  const [billingPhoneCode, setBillingPhoneCode] = useState("");
  const [billingPhone, setBillingPhone] = useState("");
  const [billingFax, setBillingFax] = useState("");

  const [copyBilling, setCopyBilling] = useState(false);
  const [shippingAttention, setShippingAttention] = useState("");
  const [shippingCountry, setShippingCountry] = useState("");
  const [shippingStreet1, setShippingStreet1] = useState("");
  const [shippingStreet2, setShippingStreet2] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingState, setShippingState] = useState("");
  const [shippingPinCode, setShippingPinCode] = useState("");
  const [shippingPhoneCode, setShippingPhoneCode] = useState("");
  const [shippingPhone, setShippingPhone] = useState("");
  const [shippingFax, setShippingFax] = useState("");

  const [contactPersons, setContactPersons] = useState<ContactPerson[]>([]);

  const [customFields, setCustomFields] = useState<{ key: string; value: string }[]>([]);

  const [remarks, setRemarks] = useState("");

  function resetForm() {
    setCustomerType(""); setSalutation(""); setFirstName(""); setLastName("");
    setCompanyName(""); setDisplayName(""); setEmail(""); setWorkPhone(""); setMobile("");
    setGstTreatment(""); setPlaceOfSupply(""); setPanNumber(""); setTaxPreference("Taxable");
    setPaymentTerms("Due on Receipt"); setPortalAccess(false); setDocuments([]);
    setBillingAttention(""); setBillingCountry(""); setBillingStreet1(""); setBillingStreet2("");
    setBillingCity(""); setBillingState(""); setBillingPinCode(""); setBillingPhoneCode(""); setBillingPhone(""); setBillingFax("");
    setCopyBilling(false);
    setShippingAttention(""); setShippingCountry(""); setShippingStreet1(""); setShippingStreet2("");
    setShippingCity(""); setShippingState(""); setShippingPinCode(""); setShippingPhoneCode(""); setShippingPhone(""); setShippingFax("");
    setContactPersons([]);
    setCustomFields([]);
    setRemarks("");
    setFormErrors({}); setApiError(""); setActiveTab("other-details");
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!companyName.trim()) errors.companyName = "Company name is required";
    if (!displayName.trim()) errors.displayName = "Display name is required";
    if (!email.trim()) errors.email = "Email address is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Invalid email format";
    if (!gstTreatment) errors.gstTreatment = "GST Treatment is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    setApiError("");

    const name = displayName || `${salutation ? salutation + " " : ""}${firstName}${lastName ? " " + lastName : ""}`;

    const payload: Record<string, unknown> = {
      name,
      email,
      company: companyName,
      clientType: customerType,
      salutation, firstName, lastName,
      displayName,
      workPhone, mobile,
      gstTreatment, placeOfSupply, panNumber, taxPreference,
      paymentTerms, portalAccess,
      billingAttention, billingCountry, billingStreet1, billingStreet2,
      billingCity, billingState, billingPinCode,
      billingPhoneCode, billingPhone, billingFax,
      copyBilling,
      shippingAttention, shippingCountry, shippingStreet1, shippingStreet2,
      shippingCity, shippingState, shippingPinCode,
      shippingPhoneCode, shippingPhone, shippingFax,
      contactPersons: JSON.stringify(contactPersons),
      customFields: JSON.stringify(customFields),
      remarks,
    };

    const res = await apiFetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (res.ok) {
      const created = result.data?.client || result;
      resetForm();
      onClientAdded?.(created);
    } else {
      if (result.fields) setFormErrors(result.fields);
      setApiError(result.fields && Object.keys(result.fields).length > 0 ? "Please correct the errors below" : (result.error || "Failed to create client"));
    }
    setSaving(false);
  }

  function fieldClass(fieldName: string): string {
    return formErrors[fieldName] ? "border-red-500 focus-visible:ring-red-400" : "";
  }

  function fieldError(fieldName: string): string | null {
    return formErrors[fieldName] || null;
  }

  function addContactPerson() {
    const newPerson: ContactPerson = {
      id: crypto.randomUUID(),
      salutation: "", firstName: "", lastName: "", email: "", workPhone: "", mobile: "",
    };
    setContactPersons((prev) => [...prev, newPerson]);
  }

  function updateContactPerson(id: string, key: keyof ContactPerson, value: string) {
    setContactPersons((prev) => prev.map((p) => (p.id === id ? { ...p, [key]: value } : p)));
  }

  function removeContactPerson(id: string) {
    setContactPersons((prev) => prev.filter((p) => p.id !== id));
  }

  function addCustomField() {
    setCustomFields((prev) => [...prev, { key: "", value: "" }]);
  }

  function updateCustomField(index: number, key: string, value: string) {
    setCustomFields((prev) => prev.map((f, i) => (i === index ? { ...f, [key]: value } : f)));
  }

  function removeCustomField(index: number) {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((f) => f.size <= 10 * 1024 * 1024);
    setDocuments((prev) => [...prev, ...validFiles].slice(0, 3));
  }

  function removeFile(index: number) {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-hidden [&_input]:border-black [&_select>button]:border-black [&_textarea]:border-black">
      {apiError && (
        <div className="mx-6 mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {apiError}
        </div>
      )}

      <div className="relative flex-1 overflow-hidden px-1">
        <ScrollArea className="h-full px-5">
          <div className="space-y-8 py-6 max-w-4xl mx-auto">
            <FieldSet>
              <FieldLegend>Customer Information</FieldLegend>
              <div className="space-y-6">
                <FieldSet>
                  <FieldLegend>Customer Type</FieldLegend>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="customerType"
                        value="Business"
                        checked={customerType === "Business"}
                        onChange={(e) => setCustomerType(e.target.value)}
                        className="size-4 accent-primary"
                      />
                      Business
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="customerType"
                        value="Individual"
                        checked={customerType === "Individual"}
                        onChange={(e) => setCustomerType(e.target.value)}
                        className="size-4 accent-primary"
                      />
                      Individual
                    </label>
                  </div>
                </FieldSet>

                <Separator />

                <FieldSet>
                  <FieldLegend>Primary Contact</FieldLegend>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Field>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Salutation</Label>
                      <Select value={salutation} onValueChange={setSalutation}>
                        <SelectTrigger><SelectValue placeholder="" /></SelectTrigger>
                        <SelectContent>
                          {SALUTATIONS.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">First Name</Label>
                      <Input placeholder="" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                    </Field>
                    <Field>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Last Name</Label>
                      <Input placeholder="" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                    </Field>
                  </div>
                </FieldSet>

                <Separator />

                <FieldSet>
                  <FieldLegend>Company Details</FieldLegend>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Company Name *</Label>
                      <Input placeholder="" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={fieldClass("companyName")} />
                      {fieldError("companyName") && <p className="text-xs text-red-500 mt-1">{fieldError("companyName")}</p>}
                    </Field>
                    <Field>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Display Name *</Label>
                      <Input placeholder="" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={fieldClass("displayName")} />
                      {fieldError("displayName") && <p className="text-xs text-red-500 mt-1">{fieldError("displayName")}</p>}
                    </Field>
                  </div>
                </FieldSet>

                <Separator />

                <FieldSet>
                  <FieldLegend>Financial Details</FieldLegend>
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Currency</Label>
                    <Input value="INR - Indian Rupee" disabled className="text-muted-foreground" />
                    <p className="text-xs text-muted-foreground mt-1">
                      Note: Currency cannot be edited as multi-currency handling is unavailable in MyworkSpace Invoice.
                    </p>
                  </Field>
                </FieldSet>

                <Separator />

                <FieldSet>
                  <FieldLegend>Contact Information</FieldLegend>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Email Address *</Label>
                      <Input placeholder="" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass("email")} />
                      {fieldError("email") && <p className="text-xs text-red-500 mt-1">{fieldError("email")}</p>}
                    </Field>
                    <Field>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Work Phone</Label>
                      <PhoneInput value={workPhone} onChange={setWorkPhone} placeholder="" />
                    </Field>
                    <Field>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Mobile</Label>
                      <PhoneInput value={mobile} onChange={setMobile} placeholder="" />
                    </Field>
                  </div>
                </FieldSet>
              </div>
            </FieldSet>

            <Separator />

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList variant="line">
                <TabsTrigger value="other-details">Other Details</TabsTrigger>
                <TabsTrigger value="address">Address</TabsTrigger>
                <TabsTrigger value="contact-persons">Contact Persons</TabsTrigger>
                <TabsTrigger value="custom-fields">Custom Fields</TabsTrigger>
                <TabsTrigger value="remarks">Remarks</TabsTrigger>
              </TabsList>

              <TabsContent value="other-details" className="space-y-6 pt-4">
                <FieldSet>
                  <FieldLegend>Tax Information</FieldLegend>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">GST Treatment *</Label>
                      <Select value={gstTreatment} onValueChange={setGstTreatment}>
                        <SelectTrigger className={fieldClass("gstTreatment")}><SelectValue placeholder="" /></SelectTrigger>
                        <SelectContent>
                          {GST_TREATMENTS.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldError("gstTreatment") && <p className="text-xs text-red-500 mt-1">{fieldError("gstTreatment")}</p>}
                    </Field>
                    <Field>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Place of Supply *</Label>
                      <Select value={placeOfSupply} onValueChange={setPlaceOfSupply}>
                        <SelectTrigger><SelectValue placeholder="" /></SelectTrigger>
                        <SelectContent>
                          {INDIAN_STATES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">PAN #</Label>
                      <Input placeholder="" value={panNumber} onChange={(e) => setPanNumber(e.target.value)} />
                    </Field>
                    <Field>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Tax Preference *</Label>
                      <div className="flex items-center gap-6 mt-1">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="radio"
                            name="taxPreference"
                            value="Taxable"
                            checked={taxPreference === "Taxable"}
                            onChange={(e) => setTaxPreference(e.target.value)}
                            className="size-4 accent-primary"
                          />
                          Taxable
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="radio"
                            name="taxPreference"
                            value="Tax Exempt"
                            checked={taxPreference === "Tax Exempt"}
                            onChange={(e) => setTaxPreference(e.target.value)}
                            className="size-4 accent-primary"
                          />
                          Tax Exempt
                        </label>
                      </div>
                    </Field>
                  </div>
                </FieldSet>

                <Separator />

                <FieldSet>
                  <FieldLegend>Payment</FieldLegend>
                  <Field>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Payment Terms</Label>
                    <Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
                  </Field>
                </FieldSet>

                <Separator />

                <FieldSet>
                  <FieldLegend>Portal Access</FieldLegend>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="portalAccess"
                      checked={portalAccess}
                      onCheckedChange={(checked) => setPortalAccess(checked === true)}
                    />
                    <Label htmlFor="portalAccess" className="text-sm font-normal cursor-pointer">
                      Allow portal access for this customer
                    </Label>
                  </div>
                </FieldSet>

                <Separator />

                <FieldSet>
                  <FieldLegend>Documents</FieldLegend>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Button type="button" variant="outline" size="sm" className="relative" disabled={documents.length >= 3}>
                        <Upload className="size-4 mr-2" />
                        Upload File
                        <input
                          type="file"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={handleFileUpload}
                          disabled={documents.length >= 3}
                          multiple
                        />
                      </Button>
                    </div>
                    {documents.length > 0 && (
                      <div className="space-y-1">
                        {documents.map((file, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="flex-1 truncate">{file.name}</span>
                            <button onClick={() => removeFile(i)} className="text-destructive hover:text-destructive/80">
                              <X className="size-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Maximum: 3 files. Maximum size: 10 MB each.
                    </p>
                  </div>
                </FieldSet>
              </TabsContent>

              <TabsContent value="address" className="space-y-6 pt-4">
                <FieldSet>
                  <FieldLegend>Billing Address</FieldLegend>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Attention</Label>
                      <Input placeholder="" value={billingAttention} onChange={(e) => setBillingAttention(e.target.value)} />
                    </Field>
                    <Field>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Country / Region</Label>
                      <LocationSelect options={pincodeResult?.countries || []} value={billingCountry} onChange={setBillingCountry} placeholder="" />
                    </Field>
                    <Field>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Street 1</Label>
                      <Input placeholder="" value={billingStreet1} onChange={(e) => setBillingStreet1(e.target.value)} />
                    </Field>
                    <Field>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Street 2</Label>
                      <Input placeholder="" value={billingStreet2} onChange={(e) => setBillingStreet2(e.target.value)} />
                    </Field>
                    <Field>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">City</Label>
                      <LocationSelect options={pincodeResult?.cities || []} value={billingCity} onChange={setBillingCity} placeholder="" />
                    </Field>
                    <Field>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">State</Label>
                      <LocationSelect options={pincodeResult?.states || []} value={billingState} onChange={setBillingState} placeholder="" />
                    </Field>
                    <Field>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Pin Code</Label>
                      <PincodeInput value={billingPinCode} onChange={setBillingPinCode} onResult={setPincodeResult} />
                    </Field>
                    <Field>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Phone</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <Input placeholder="" value={billingPhoneCode} onChange={(e) => setBillingPhoneCode(e.target.value)} />
                        <Input placeholder="" className="col-span-2" value={billingPhone} onChange={(e) => setBillingPhone(e.target.value)} />
                      </div>
                    </Field>
                    <Field>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Fax Number</Label>
                      <Input placeholder="" value={billingFax} onChange={(e) => setBillingFax(e.target.value)} />
                    </Field>
                  </div>
                </FieldSet>

                <Separator />

                <FieldSet>
                  <FieldLegend>Shipping Address</FieldLegend>
                  <div className="flex items-center gap-2 mb-4">
                    <Checkbox
                      id="copyBilling"
                      checked={copyBilling}
                      onCheckedChange={(checked) => {
                        const isCopy = checked === true;
                        setCopyBilling(isCopy);
                        if (isCopy) {
                          setShippingAttention(billingAttention);
                          setShippingCountry(billingCountry);
                          setShippingStreet1(billingStreet1);
                          setShippingStreet2(billingStreet2);
                          setShippingCity(billingCity);
                          setShippingState(billingState);
                          setShippingPinCode(billingPinCode);
                          setShippingPhoneCode(billingPhoneCode);
                          setShippingPhone(billingPhone);
                          setShippingFax(billingFax);
                        }
                      }}
                    />
                    <Label htmlFor="copyBilling" className="text-sm font-normal cursor-pointer">
                      Copy Billing Address
                    </Label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Attention</Label>
                      <Input placeholder="" value={shippingAttention} onChange={(e) => setShippingAttention(e.target.value)} disabled={copyBilling} />
                    </Field>
                    <Field>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Country / Region</Label>
                      <LocationSelect options={pincodeResult?.countries || []} value={shippingCountry} onChange={setShippingCountry} placeholder="" />
                    </Field>
                    <Field>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Street 1</Label>
                      <Input placeholder="" value={shippingStreet1} onChange={(e) => setShippingStreet1(e.target.value)} disabled={copyBilling} />
                    </Field>
                    <Field>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Street 2</Label>
                      <Input placeholder="" value={shippingStreet2} onChange={(e) => setShippingStreet2(e.target.value)} disabled={copyBilling} />
                    </Field>
                    <Field>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">City</Label>
                      <LocationSelect options={pincodeResult?.cities || []} value={shippingCity} onChange={setShippingCity} placeholder="" />
                    </Field>
                    <Field>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">State</Label>
                      <LocationSelect options={pincodeResult?.states || []} value={shippingState} onChange={setShippingState} placeholder="" />
                    </Field>
                    <Field>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Pin Code</Label>
                      <PincodeInput value={shippingPinCode} onChange={setShippingPinCode} onResult={setPincodeResult} />
                    </Field>
                    <Field>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Phone</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <Input placeholder="" value={shippingPhoneCode} onChange={(e) => setShippingPhoneCode(e.target.value)} disabled={copyBilling} />
                        <Input placeholder="" className="col-span-2" value={shippingPhone} onChange={(e) => setShippingPhone(e.target.value)} disabled={copyBilling} />
                      </div>
                    </Field>
                    <Field>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Fax Number</Label>
                      <Input placeholder="" value={shippingFax} onChange={(e) => setShippingFax(e.target.value)} disabled={copyBilling} />
                    </Field>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    You can customize how customer addresses are displayed in transaction PDFs. Navigate to:
                    Settings → Preferences → Customers → Address Format
                  </p>
                </FieldSet>
              </TabsContent>

              <TabsContent value="contact-persons" className="space-y-4 pt-4">
                <div className="space-y-3">
                  {contactPersons.map((cp) => (
                    <div key={cp.id} className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Contact Person</span>
                        <Button type="button" variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => removeContactPerson(cp.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Field>
                          <Label className="text-xs text-muted-foreground mb-1.5 block">Salutation</Label>
                          <Select value={cp.salutation} onValueChange={(v) => updateContactPerson(cp.id, "salutation", v)}>
                            <SelectTrigger><SelectValue placeholder="" /></SelectTrigger>
                            <SelectContent>
                              {SALUTATIONS.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field>
                          <Label className="text-xs text-muted-foreground mb-1.5 block">First Name</Label>
                          <Input placeholder="" value={cp.firstName} onChange={(e) => updateContactPerson(cp.id, "firstName", e.target.value)} />
                        </Field>
                        <Field>
                          <Label className="text-xs text-muted-foreground mb-1.5 block">Last Name</Label>
                          <Input placeholder="" value={cp.lastName} onChange={(e) => updateContactPerson(cp.id, "lastName", e.target.value)} />
                        </Field>
                        <Field>
                          <Label className="text-xs text-muted-foreground mb-1.5 block">Email Address</Label>
                          <Input placeholder="" type="email" value={cp.email} onChange={(e) => updateContactPerson(cp.id, "email", e.target.value)} />
                        </Field>
                        <Field>
                          <Label className="text-xs text-muted-foreground mb-1.5 block">Work Phone</Label>
                          <PhoneInput value={cp.workPhone} onChange={(value) => updateContactPerson(cp.id, "workPhone", value)} placeholder="" />
                        </Field>
                        <Field>
                          <Label className="text-xs text-muted-foreground mb-1.5 block">Mobile</Label>
                          <PhoneInput value={cp.mobile} onChange={(value) => updateContactPerson(cp.id, "mobile", value)} placeholder="" />
                        </Field>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addContactPerson}>
                    <Plus className="size-4 mr-2" />
                    Add Contact Person
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="custom-fields" className="space-y-4 pt-4">
                <div className="space-y-3">
                  {customFields.map((field, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Input
                        placeholder=""
                        value={field.key}
                        onChange={(e) => updateCustomField(index, "key", e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        placeholder=""
                        value={field.value}
                        onChange={(e) => updateCustomField(index, "value", e.target.value)}
                        className="flex-1"
                      />
                      <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0 text-destructive" onClick={() => removeCustomField(index)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addCustomField}>
                    <Plus className="size-4 mr-2" />
                    Add Custom Field
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="remarks" className="pt-4">
                <Field>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Remarks</Label>
                  <textarea
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[200px]"
                    placeholder=""
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                </Field>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </div>

      <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/10">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <div className="flex gap-3">
          <Button className="bg-primary hover:bg-primary/80 w-32" onClick={handleSubmit} disabled={saving}>
            {saving ? <><Loader2 className="mr-2 size-4 animate-spin" /> Saving...</> : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
