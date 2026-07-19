"use client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Contractor } from "@/app/contractors/columns";

type Props = {
  contractor: Contractor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const FieldDisplay = ({ label, value }: { label: string; value?: string | number | boolean | null }) => (
  <div className="space-y-0.5">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-sm font-medium">{value ?? "—"}</p>
  </div>
);

export function ContractorViewDialog({ contractor, open, onOpenChange }: Props) {
  if (!contractor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>{contractor.fullName}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-2">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <FieldDisplay label="Full Name" value={contractor.fullName} />
                <FieldDisplay label="Company" value={contractor.companyName} />
                <FieldDisplay label="Mobile" value={contractor.mobileNumber} />
                <FieldDisplay label="Email" value={contractor.emailAddress} />
                <FieldDisplay label="Country" value={contractor.country} />
                <FieldDisplay label="City" value={contractor.city} />
                <FieldDisplay label="Address" value={contractor.address} />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2">Contractor Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <FieldDisplay label="Type" value={contractor.contractorType} />
                <FieldDisplay label="Trade" value={contractor.mainTrade} />
                <FieldDisplay label="Experience" value={`${contractor.yearsOfExperience} yrs`} />
                <FieldDisplay label="Workers" value={contractor.numberOfWorkers} />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2">License & Insurance</h3>
              <div className="grid grid-cols-2 gap-4">
                <FieldDisplay label="License Number" value={contractor.licenseNumber} />
                <FieldDisplay label="License Expiry" value={contractor.licenseExpiry} />
                <FieldDisplay label="Insurance" value={contractor.insuranceAvailable} />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2">Work Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <FieldDisplay label="Available From" value={contractor.availableFrom} />
                <FieldDisplay label="Preferred Area" value={contractor.preferredWorkArea} />
                <FieldDisplay label="Willing to Travel" value={contractor.willingToTravel} />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2">Payment Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <FieldDisplay label="Account Holder" value={contractor.accountHolderName} />
                <FieldDisplay label="Bank" value={contractor.bankName} />
                <FieldDisplay label="Account Number" value={contractor.accountNumber} />
                <FieldDisplay label="SWIFT/BIC" value={contractor.swiftBic} />
                <FieldDisplay label="Currency" value={contractor.currency} />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2">Emergency Contacts</h3>
              <div className="space-y-2">
                {contractor.emergencyContacts?.map((c, i) => (
                  <div key={i} className="rounded-lg border p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Contact {i + 1}</p>
                    <div className="grid grid-cols-3 gap-4">
                      <FieldDisplay label="Name" value={c.name} />
                      <FieldDisplay label="Phone" value={c.phoneNumber} />
                      <FieldDisplay label="Email" value={c.email} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
