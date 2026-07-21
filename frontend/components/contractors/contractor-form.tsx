"use client"
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";

const CONTRACTOR_TYPES = ["Individual", "Company", "Subcontractor"];
const MAIN_TRADES = [
  "Civil", "Electrical", "Plumbing", "Carpentry", "Painting",
  "Mason", "Steel", "HVAC", "Roofing", "Flooring", "Other",
];
const COUNTRIES = [
  "India", "United States", "United Kingdom", "Canada", "Australia",
  "Germany", "France", "UAE", "Saudi Arabia", "Qatar", "Kuwait", "Oman",
  "Bahrain", "Singapore", "Malaysia", "Other",
];
const CURRENCIES = ["USD", "EUR", "GBP", "INR", "AED", "SAR", "QAR", "KWD", "OMR", "BHD", "SGD", "MYR", "Other"];
const CITIES: Record<string, string[]> = {
  "India": ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow", "Other"],
  "United States": ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "Other"],
  "United Kingdom": ["London", "Manchester", "Birmingham", "Glasgow", "Edinburgh", "Liverpool", "Bristol", "Other"],
  "Canada": ["Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa", "Edmonton", "Other"],
  "Australia": ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Gold Coast", "Other"],
  "UAE": ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Other"],
  "Saudi Arabia": ["Riyadh", "Jeddah", "Mecca", "Medina", "Dammam", "Other"],
  "Qatar": ["Doha", "Al Wakrah", "Other"],
  "Kuwait": ["Kuwait City", "Al Ahmadi", "Other"],
  "Oman": ["Muscat", "Salalah", "Other"],
  "Bahrain": ["Manama", "Riffa", "Other"],
  "Singapore": ["Singapore"],
  "Malaysia": ["Kuala Lumpur", "Penang", "Johor Bahru", "Other"],
  "Germany": ["Berlin", "Munich", "Hamburg", "Frankfurt", "Cologne", "Other"],
  "France": ["Paris", "Marseille", "Lyon", "Toulouse", "Other"],
};
const YEARS_RANGES = ["0-1", "1-2", "2-3", "3-5", "5-10", "10+"];
const WORKER_RANGES = ["1", "2-5", "6-10", "11-20", "21-50", "50+"];
const WORK_AREAS = ["City Center", "Downtown", "Industrial Area", "Residential Area", "Commercial Zone", "Airport Area", "Port Area", "Suburbs", "Rural Area", "Multiple Locations", "Other"];

type EmergencyContact = { id: string; name: string; phoneNumber: string; email: string };

type ContractorFormProps = {
  onCancel?: () => void;
  onContractorAdded?: () => void;
};

export function ContractorForm({ onCancel, onContractorAdded }: ContractorFormProps) {
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");

  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");

  const [contractorType, setContractorType] = useState("");
  const [mainTrade, setMainTrade] = useState("");
  const [otherTrade, setOtherTrade] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [numberOfWorkers, setNumberOfWorkers] = useState("");

  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseExpiry, setLicenseExpiry] = useState("");
  const [insuranceAvailable, setInsuranceAvailable] = useState("");

  const [availableFrom, setAvailableFrom] = useState("");
  const [preferredWorkArea, setPreferredWorkArea] = useState("");
  const [willingToTravel, setWillingToTravel] = useState("");

  const [accountHolderName, setAccountHolderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [swiftBic, setSwiftBic] = useState("");
  const [currency, setCurrency] = useState("");

  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([
    { id: crypto.randomUUID(), name: "", phoneNumber: "", email: "" },
  ]);

  const [clientCompanies, setClientCompanies] = useState<string[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/clients", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        const list = data.data || data || [];
        const companies = (Array.isArray(list) ? list : [])
          .map((c: Record<string, unknown>) => (c.company || c.name) as string)
          .filter(Boolean);
        setClientCompanies([...new Set(companies)]);
      })
      .catch(() => {});
  }, []);

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!fullName.trim()) errors.fullName = "Full name is required";
    if (!mobileNumber.trim()) errors.mobileNumber = "Mobile number is required";
    if (!emailAddress.trim()) errors.emailAddress = "Email address is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)) errors.emailAddress = "Invalid email format";
    if (!country) errors.country = "Country is required";
    if (!city.trim()) errors.city = "City is required";
    if (!contractorType) errors.contractorType = "Contractor type is required";
    if (!mainTrade) errors.mainTrade = "Main trade is required";
    if (!yearsOfExperience) errors.yearsOfExperience = "Years of experience is required";
    if (!numberOfWorkers) errors.numberOfWorkers = "Number of workers is required";
    if (!insuranceAvailable) errors.insuranceAvailable = "Insurance availability is required";
    if (!availableFrom) errors.availableFrom = "Available from is required";
    if (!preferredWorkArea.trim()) errors.preferredWorkArea = "Preferred work area is required";
    if (!willingToTravel) errors.willingToTravel = "Willing to travel is required";
    if (!accountHolderName.trim()) errors.accountHolderName = "Account holder name is required";
    if (!bankName.trim()) errors.bankName = "Bank name is required";
    if (!accountNumber.trim()) errors.accountNumber = "Account number is required";
    if (!currency) errors.currency = "Currency is required";
    const validContacts = emergencyContacts.filter((c) => c.name.trim() && c.phoneNumber.trim());
    if (validContacts.length === 0) errors.emergencyContacts = "At least one emergency contact with name and phone is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function fieldClass(fieldName: string): string {
    return formErrors[fieldName] ? "border-red-500 focus-visible:ring-red-400" : "";
  }

  function fieldError(fieldName: string): string | null {
    return formErrors[fieldName] || null;
  }

  function addContact() {
    setEmergencyContacts((prev) => [...prev, { id: crypto.randomUUID(), name: "", phoneNumber: "", email: "" }]);
  }

  function removeContact(id: string) {
    setEmergencyContacts((prev) => prev.filter((c) => c.id !== id));
  }

  function updateContact(id: string, key: keyof EmergencyContact, value: string) {
    setEmergencyContacts((prev) => prev.map((c) => (c.id === id ? { ...c, [key]: value } : c)));
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    setApiError("");

    const payload: Record<string, unknown> = {
      fullName,
      companyName: companyName || undefined,
      mobileNumber,
      emailAddress,
      country,
      city,
      address: address || undefined,
      contractorType,
      mainTrade,
      otherTrade: mainTrade === "Other" ? otherTrade : undefined,
      yearsOfExperience,
      numberOfWorkers,
      licenseNumber: licenseNumber || undefined,
      licenseExpiry: licenseExpiry || undefined,
      insuranceAvailable,
      availableFrom,
      preferredWorkArea,
      willingToTravel,
      accountHolderName,
      bankName,
      accountNumber,
      swiftBic: swiftBic || undefined,
      currency,
      emergencyContacts: emergencyContacts
        .filter((c) => c.name.trim() && c.phoneNumber.trim())
        .map(({ id: _, ...rest }) => rest),
    };

    const res = await apiFetch("/api/contractors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (res.ok) {
      onContractorAdded?.();
    } else {
      if (result.fields) setFormErrors(result.fields);
      setApiError(result.fields && Object.keys(result.fields).length > 0
        ? "Please correct the errors below"
        : (result.error || "Failed to create contractor"));
    }
    setSaving(false);
  }

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-hidden">
      {apiError && (
        <div className="mx-6 mt-4 flex items-start gap-3 rounded-lg border-2 border-red-300 bg-gradient-to-r from-red-50 to-amber-50 px-4 py-3 shadow-sm">
          <AlertCircle className="size-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-red-800">{apiError}</p>
        </div>
      )}

      <div className="relative flex-1 overflow-hidden px-1">
        <ScrollArea className="h-full px-5">
          <div className="space-y-8 py-6 w-full">

            {/* 1. Basic Information */}
            <fieldset className="rounded-xl border p-4 space-y-4">
              <legend className="text-sm font-semibold px-2">1. Basic Information</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Full Name *</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className={fieldClass("fullName")} />
                  {fieldError("fullName") && <p className="text-xs text-red-500">{fieldError("fullName")}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Company Name</Label>
                  <Select value={companyName} onValueChange={setCompanyName}>
                    <SelectTrigger><SelectValue placeholder="Select or type" /></SelectTrigger>
                    <SelectContent>
                      {clientCompanies.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Mobile Number *</Label>
                  <Input value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} className={fieldClass("mobileNumber")} />
                  {fieldError("mobileNumber") && <p className="text-xs text-red-500">{fieldError("mobileNumber")}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Email Address *</Label>
                  <Input type="email" value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} className={fieldClass("emailAddress")} />
                  {fieldError("emailAddress") && <p className="text-xs text-red-500">{fieldError("emailAddress")}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Country *</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger className={fieldClass("country")}><SelectValue placeholder="" /></SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  {fieldError("country") && <p className="text-xs text-red-500">{fieldError("country")}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">City *</Label>
                  <Select value={city} onValueChange={setCity} disabled={!country}>
                    <SelectTrigger className={fieldClass("city")}><SelectValue placeholder={country ? "Select city" : "Select country first"} /></SelectTrigger>
                    <SelectContent>
                      {(CITIES[country] || []).map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  {fieldError("city") && <p className="text-xs text-red-500">{fieldError("city")}</p>}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Address</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </fieldset>

            {/* 2. Contractor Details */}
            <fieldset className="rounded-xl border p-4 space-y-4">
              <legend className="text-sm font-semibold px-2">2. Contractor Details</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Contractor Type *</Label>
                  <Select value={contractorType} onValueChange={setContractorType}>
                    <SelectTrigger className={fieldClass("contractorType")}><SelectValue placeholder="" /></SelectTrigger>
                    <SelectContent>
                      {CONTRACTOR_TYPES.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  {fieldError("contractorType") && <p className="text-xs text-red-500">{fieldError("contractorType")}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Main Trade *</Label>
                  <Select value={mainTrade} onValueChange={setMainTrade}>
                    <SelectTrigger className={fieldClass("mainTrade")}><SelectValue placeholder="" /></SelectTrigger>
                    <SelectContent>
                      {MAIN_TRADES.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  {fieldError("mainTrade") && <p className="text-xs text-red-500">{fieldError("mainTrade")}</p>}
                </div>
                {mainTrade === "Other" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Specify Trade</Label>
                    <Input value={otherTrade} onChange={(e) => setOtherTrade(e.target.value)} />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Years of Experience *</Label>
                  <Select value={yearsOfExperience} onValueChange={setYearsOfExperience}>
                    <SelectTrigger className={fieldClass("yearsOfExperience")}><SelectValue placeholder="" /></SelectTrigger>
                    <SelectContent>
                      {YEARS_RANGES.map((y) => (<SelectItem key={y} value={y}>{y} {y === "10+" ? "years" : "year"}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  {fieldError("yearsOfExperience") && <p className="text-xs text-red-500">{fieldError("yearsOfExperience")}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Number of Workers *</Label>
                  <Select value={numberOfWorkers} onValueChange={setNumberOfWorkers}>
                    <SelectTrigger className={fieldClass("numberOfWorkers")}><SelectValue placeholder="" /></SelectTrigger>
                    <SelectContent>
                      {WORKER_RANGES.map((w) => (<SelectItem key={w} value={w}>{w} worker{w === "1" ? "" : "s"}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  {fieldError("numberOfWorkers") && <p className="text-xs text-red-500">{fieldError("numberOfWorkers")}</p>}
                </div>
              </div>
            </fieldset>

            {/* 3. License & Insurance */}
            <fieldset className="rounded-xl border p-4 space-y-4">
              <legend className="text-sm font-semibold px-2">3. License & Insurance</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">License Number</Label>
                  <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">License Expiry</Label>
                  <Input type="date" value={licenseExpiry} onChange={(e) => setLicenseExpiry(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Insurance Available? *</Label>
                  <Select value={insuranceAvailable} onValueChange={setInsuranceAvailable}>
                    <SelectTrigger className={fieldClass("insuranceAvailable")}><SelectValue placeholder="" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldError("insuranceAvailable") && <p className="text-xs text-red-500">{fieldError("insuranceAvailable")}</p>}
                </div>
              </div>
            </fieldset>

            {/* 4. Work Information */}
            <fieldset className="rounded-xl border p-4 space-y-4">
              <legend className="text-sm font-semibold px-2">4. Work Information</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Available From *</Label>
                  <Input type="date" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} className={fieldClass("availableFrom")} />
                  {fieldError("availableFrom") && <p className="text-xs text-red-500">{fieldError("availableFrom")}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Preferred Work Area *</Label>
                  <Select value={preferredWorkArea} onValueChange={setPreferredWorkArea}>
                    <SelectTrigger className={fieldClass("preferredWorkArea")}><SelectValue placeholder="" /></SelectTrigger>
                    <SelectContent>
                      {WORK_AREAS.map((a) => (<SelectItem key={a} value={a}>{a}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  {fieldError("preferredWorkArea") && <p className="text-xs text-red-500">{fieldError("preferredWorkArea")}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Willing to Travel? *</Label>
                  <Select value={willingToTravel} onValueChange={setWillingToTravel}>
                    <SelectTrigger className={fieldClass("willingToTravel")}><SelectValue placeholder="" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldError("willingToTravel") && <p className="text-xs text-red-500">{fieldError("willingToTravel")}</p>}
                </div>
              </div>
            </fieldset>

            {/* 5. Payment Details */}
            <fieldset className="rounded-xl border p-4 space-y-4">
              <legend className="text-sm font-semibold px-2">5. Payment Details</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Account Holder Name *</Label>
                  <Input value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} className={fieldClass("accountHolderName")} />
                  {fieldError("accountHolderName") && <p className="text-xs text-red-500">{fieldError("accountHolderName")}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Bank Name *</Label>
                  <Input value={bankName} onChange={(e) => setBankName(e.target.value)} className={fieldClass("bankName")} />
                  {fieldError("bankName") && <p className="text-xs text-red-500">{fieldError("bankName")}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Account Number / IBAN *</Label>
                  <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className={fieldClass("accountNumber")} />
                  {fieldError("accountNumber") && <p className="text-xs text-red-500">{fieldError("accountNumber")}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">SWIFT / BIC</Label>
                  <Input value={swiftBic} onChange={(e) => setSwiftBic(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Currency *</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className={fieldClass("currency")}><SelectValue placeholder="" /></SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  {fieldError("currency") && <p className="text-xs text-red-500">{fieldError("currency")}</p>}
                </div>
              </div>
            </fieldset>

            {/* 6. Emergency Contact */}
            <fieldset className="rounded-xl border p-4 space-y-4">
              <legend className="text-sm font-semibold px-2">6. Emergency Contact</legend>
              {fieldError("emergencyContacts") && <p className="text-xs text-red-500">{fieldError("emergencyContacts")}</p>}
              <div className="space-y-3">
                {emergencyContacts.map((contact) => (
                  <div key={contact.id} className="rounded-lg border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Contact</span>
                      {emergencyContacts.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => removeContact(contact.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Name *</Label>
                        <Input value={contact.name} onChange={(e) => updateContact(contact.id, "name", e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Phone Number *</Label>
                        <Input value={contact.phoneNumber} onChange={(e) => updateContact(contact.id, "phoneNumber", e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Email</Label>
                        <Input type="email" value={contact.email} onChange={(e) => updateContact(contact.id, "email", e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addContact}>
                  <Plus className="size-4 mr-2" />
                  Add Another Contact
                </Button>
              </div>
            </fieldset>

          </div>
        </ScrollArea>
      </div>

      <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/10">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button className="bg-primary hover:bg-primary/80 w-32" onClick={handleSubmit} disabled={saving}>
          {saving ? <><Loader2 className="mr-2 size-4 animate-spin" /> Saving...</> : "Save"}
        </Button>
      </div>
    </div>
  );
}
