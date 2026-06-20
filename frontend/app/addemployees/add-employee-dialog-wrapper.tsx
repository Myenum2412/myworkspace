"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AddEmployeeForm } from "./add-employee-form"

export function AddEmployeeDialogWrapper() {
  const router = useRouter()
  const [open, setOpen] = React.useState(true)

  const handleClose = () => {
    setOpen(false)
    router.push("/employees")
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose()
    }}>
      <DialogContent className="max-w-screen-xl w-full min-w-[95vw] max-h-[95vh] h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0 w-full">
          <DialogTitle>Add New Employee</DialogTitle>
        </DialogHeader>
        <div className="flex-1 px-6 pb-6 min-h-0 overflow-hidden">
          <AddEmployeeForm onCancel={handleClose} onEmployeeAdded={handleClose} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
