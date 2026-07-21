import { createNotification } from "../../services/notification.service.js";

export const notifyHR = {
  async employeeOnboarded(userId: string, orgId: string, onboardedBy: string, employeeName: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "employee_onboarded", category: "hr",
      title: "Employee Onboarded",
      message: `${employeeName} has been onboarded by ${onboardedBy}`,
      link: "/employees",
      metadata: { employeeName },
    });
  },

  async employeeTerminated(userId: string, orgId: string, terminatedBy: string, employeeName: string, reason: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "employee_terminated", category: "hr", priority: "high",
      title: "Employee Terminated",
      message: `${employeeName} has been terminated${reason ? `: ${reason}` : ""}`,
      link: "/employees",
      metadata: { employeeName, reason },
    });
  },

  async leaveRequestSubmitted(userId: string, orgId: string, employeeName: string, leaveType: string, startDate: string, endDate: string, duration: string, link?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "leave_request_submitted", category: "hr",
      title: "Leave Request Submitted",
      message: `${employeeName} requested ${leaveType} leave (${duration}): ${startDate} - ${endDate}`,
      link: link || "/employees/leave",
      actions: [
        { label: "Approve", action: "approve", url: link || "/employees/leave" },
        { label: "Reject", action: "reject", url: link || "/employees/leave" },
        { label: "Review", action: "view", url: link || "/employees/leave", primary: true },
      ],
      metadata: { employeeName, leaveType, startDate, endDate, duration },
    });
  },

  async leaveApproved(userId: string, orgId: string, approvedBy: string, leaveType: string, startDate: string, endDate: string, duration: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "leave_approved", category: "hr",
      title: "Leave Approved",
      message: `Your ${leaveType} leave (${duration}) from ${startDate} to ${endDate} was approved by ${approvedBy}`,
      link: "/employees/leave",
      metadata: { leaveType, startDate, endDate, duration, approvedBy },
    });
  },

  async leaveRejected(userId: string, orgId: string, rejectedBy: string, leaveType: string, startDate: string, endDate: string, reason?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "leave_rejected", category: "hr",
      title: "Leave Rejected",
      message: `Your ${leaveType} leave request was rejected by ${rejectedBy}${reason ? `: ${reason}` : ""}`,
      link: "/employees/leave",
      metadata: { leaveType, startDate, endDate, reason, rejectedBy },
    });
  },

  async attendanceAnomaly(userId: string, orgId: string, employeeName: string, anomaly: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "attendance_anomaly", category: "hr", priority: "high",
      title: "Attendance Anomaly Detected",
      message: `${employeeName}: ${anomaly}`,
      link: "/employees/attendance",
      metadata: { employeeName, anomaly },
    });
  },

  async payrollProcessed(userId: string, orgId: string, processedBy: string, period: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "payroll_processed", category: "hr",
      title: "Payroll Processed",
      message: `Payroll for ${period} has been processed by ${processedBy}`,
      link: "/employees/payroll",
      metadata: { period },
    });
  },

  async salaryCredited(userId: string, orgId: string, amount: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "salary_credited", category: "hr",
      title: "Salary Credited",
      message: `Your salary of ${amount} has been credited.`,
      link: "/employees/payroll",
      metadata: { amount },
    });
  },

  async performanceReviewScheduled(userId: string, orgId: string, scheduledBy: string, reviewDate: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "performance_review_scheduled", category: "hr",
      title: "Performance Review Scheduled",
      message: `A performance review has been scheduled for ${reviewDate} by ${scheduledBy}`,
      link: "/employees/reviews",
      metadata: { reviewDate },
    });
  },

  async performanceReviewCompleted(userId: string, orgId: string, completedBy: string, rating?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "performance_review_completed", category: "hr",
      title: "Performance Review Completed",
      message: `Your performance review has been completed${rating ? ` (Rating: ${rating})` : ""}`,
      link: "/employees/reviews",
      metadata: { rating },
    });
  },

  async trainingAssigned(userId: string, orgId: string, assignedBy: string, trainingName: string, dueDate: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "training_assigned", category: "hr",
      title: "Training Assigned",
      message: `${assignedBy} assigned "${trainingName}" training (due: ${dueDate})`,
      link: "/employees/training",
      actions: [{ label: "Start Training", action: "view", url: "/employees/training", primary: true }],
      metadata: { trainingName, dueDate },
    });
  },

  async certificationExpired(userId: string, orgId: string, certName: string, expiredDate: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "certification_expired", category: "hr", priority: "high",
      title: "Certification Expired",
      message: `Your "${certName}" certification expired on ${expiredDate}`,
      link: "/employees/certifications",
      actions: [{ label: "Renew Now", action: "view", url: "/employees/certifications", primary: true }],
      metadata: { certName, expiredDate },
    });
  },
};
