import { env } from "../config/env.js";
import { logger } from "../lib/logger/index.js";

export interface ParsedAppointmentRequest {
  patientName: string;
  mobileNumber: string;
  appointmentDate: string;
  preferredTime: string;
  reasonForVisit: string;
  doctorId?: string;
  confidence: number;
}

export interface HermesResult {
  detected: boolean;
  intent: "book_appointment" | "cancel_appointment" | "reschedule" | "check_status" | "unknown";
  data?: Partial<ParsedAppointmentRequest>;
  rawText: string;
}

const APPOINTMENT_KEYWORDS = [
  "appointment", "book", "schedule", "visit", "consultation",
  "checkup", "check-up", "see doctor", "meet doctor",
  "appointment", "booking", "reserve",
];

const CANCEL_KEYWORDS = ["cancel", "cancel appointment", "cancel my appointment"];
const RESCHEDULE_KEYWORDS = ["reschedule", "change appointment", "move appointment"];
const STATUS_KEYWORDS = ["status", "check status", "my appointment", "when is my"];

function detectIntent(text: string): HermesResult["intent"] {
  const lower = text.toLowerCase();

  const hasAppointmentWord = APPOINTMENT_KEYWORDS.some((k) => lower.includes(k));

  if (CANCEL_KEYWORDS.some((k) => lower.includes(k))) {
    return "cancel_appointment";
  }

  if (RESCHEDULE_KEYWORDS.some((k) => lower.includes(k))) {
    return "reschedule";
  }

  if (STATUS_KEYWORDS.some((k) => lower.includes(k))) {
    return "check_status";
  }

  if (hasAppointmentWord && (lower.includes("book") || lower.includes("schedule") || lower.includes("need") || lower.includes("want"))) {
    return "book_appointment";
  }

  if (hasAppointmentWord) {
    return "book_appointment";
  }

  return "unknown";
}

export function extractDate(text: string): string | undefined {
  const today = new Date();

  const lower = text.toLowerCase();

  if (lower.includes("today")) {
    return today.toISOString().split("T")[0];
  }

  if (lower.includes("tomorrow")) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  }

  if (lower.includes("day after tomorrow")) {
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);
    return dayAfter.toISOString().split("T")[0];
  }

  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  for (let i = 0; i < dayNames.length; i++) {
    if (lower.includes(dayNames[i])) {
      const targetDay = i;
      const currentDay = today.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      const nextDate = new Date(today);
      nextDate.setDate(nextDate.getDate() + daysUntil);
      return nextDate.toISOString().split("T")[0];
    }
  }

  const datePatterns = [
    /(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/,
    /(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/,
    /(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(\d{2,4})?/i,
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{2,4})?/i,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (pattern === datePatterns[0]) {
        let [, a, b, c] = match;
        const yearPart = c.length === 2 ? `20${c}` : c;
        return `${yearPart}-${a.padStart(2, "0")}-${b.padStart(2, "0")}`;
      }
      if (pattern === datePatterns[1]) {
        let [, year, month, day] = match;
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }
      if (pattern === datePatterns[2] || pattern === datePatterns[3]) {
        const monthMap: Record<string, string> = {
          jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
          jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
        };
        if (pattern === datePatterns[2]) {
          let [, day, monthStr, yearStr] = match;
          const month = monthMap[monthStr.toLowerCase()];
          if (!month) continue;
          const year = yearStr || today.getFullYear().toString();
          const y = year.length === 2 ? `20${year}` : year;
          return `${y}-${month}-${day.padStart(2, "0")}`;
        } else {
          let [, monthStr, day, yearStr] = match;
          const month = monthMap[monthStr.toLowerCase()];
          if (!month) continue;
          const year = yearStr || today.getFullYear().toString();
          const y = year.length === 2 ? `20${year}` : year;
          return `${y}-${month}-${day.padStart(2, "0")}`;
        }
      }
    }
  }

  return undefined;
}

export function extractTime(text: string): string | undefined {
  const lower = text.toLowerCase();

  const timePatterns = [
    /(\d{1,2}):(\d{2})\s*(am|pm)/i,
    /(\d{1,2})\s*(am|pm)/i,
    /(\d{1,2}):(\d{2})\s*hrs/i,
  ];

  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (pattern === timePatterns[0]) {
        let [, hours, minutes, meridiem] = match;
        let h = parseInt(hours);
        const m = minutes;
        const ampm = meridiem.toLowerCase();
        if (ampm === "pm" && h < 12) h += 12;
        if (ampm === "am" && h === 12) h = 0;
        const hourStr = h.toString().padStart(2, "0");
        return `${hourStr}:${m}`;
      }
      if (pattern === timePatterns[1]) {
        let [, hours, meridiem] = match;
        let h = parseInt(hours);
        const ampm = meridiem.toLowerCase();
        if (ampm === "pm" && h < 12) h += 12;
        if (ampm === "am" && h === 12) h = 0;
        const hourStr = h.toString().padStart(2, "0");
        return `${hourStr}:00`;
      }
      if (pattern === timePatterns[2]) {
        let [, hours, minutes] = match;
        return `${hours.padStart(2, "0")}:${minutes}`;
      }
    }
  }

  if (lower.includes("morning")) return "09:00";
  if (lower.includes("afternoon")) return "14:00";
  if (lower.includes("evening")) return "17:00";

  return undefined;
}

function extractName(text: string): string | undefined {
  const lower = text.toLowerCase();

  const namePatterns = [
    /(?:my name is|i am|i'm|calling for|name is)\s+([A-Za-z\s]+?)(?:\.|,| and | I | my | i |$)/i,
    /(?:for|patient)\s+([A-Za-z\s]+?)(?:\.|,| at | on | at |$)/i,
  ];

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match) {
      const name = match[1].trim();
      if (name.length > 1 && name.length < 50) {
        return name.charAt(0).toUpperCase() + name.slice(1);
      }
    }
  }

  return undefined;
}

function extractReason(text: string): string | undefined {
  const lower = text.toLowerCase();

  const reasonPatterns = [
    /(?:for|reason|because|due to|regarding|about)\s+(.+?)(?:\.|,| at | on | in | please| thanks| thank you|\.|$)/i,
    /(?:need|want|require|looking for)\s+(?:a\s+|an\s+)?(.+?)(?:\.|,| at | on | please| thanks|$)/i,
  ];

  for (const pattern of reasonPatterns) {
    const match = text.match(pattern);
    if (match) {
      const reason = match[1].trim();
      if (reason.length > 2 && reason.length < 100) {
        return reason.charAt(0).toUpperCase() + reason.slice(1);
      }
    }
  }

  if (/fever|cold|cough|headache|pain|checkup|consultation|follow.up|vaccination|test|report/i.test(lower)) {
    const matched = lower.match(/(fever|cold|cough|headache|pain|checkup|consultation|follow.up|vaccination|test|report)/i);
    if (matched) {
      return matched[0].charAt(0).toUpperCase() + matched[0].slice(1);
    }
  }

  return "General consultation";
}

export function extractPhone(from: string): string {
  if (from.startsWith("91") && from.length === 12) {
    return `+${from}`;
  }
  return from.startsWith("+") ? from : `+${from}`;
}

const MONTH_NAMES = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

export function normalizeToTimeSlot(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const h = hours % 12 || 12;
  const ampm = hours >= 12 ? "PM" : "AM";
  return `${h.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")} ${ampm}`;
}

export function parseMessage(text: string, from: string): HermesResult {
  const intent = detectIntent(text);
  const result: HermesResult = { detected: false, intent, rawText: text };

  if (intent === "unknown") {
    return result;
  }

  result.detected = true;

  if (intent === "book_appointment") {
    const patientName = extractName(text);
    const appointmentDate = extractDate(text);
    const preferredTime = extractTime(text);
    const reasonForVisit = extractReason(text);
    const mobileNumber = extractPhone(from);

    let confidence = 0;
    if (patientName) confidence += 0.3;
    if (appointmentDate) confidence += 0.3;
    if (preferredTime) confidence += 0.25;
    if (reasonForVisit && reasonForVisit !== "General consultation") confidence += 0.15;

    result.data = {
      patientName,
      mobileNumber,
      appointmentDate,
      preferredTime: preferredTime ? normalizeToTimeSlot(preferredTime) : undefined,
      reasonForVisit,
      doctorId: env.HERMES_DEFAULT_DOCTOR_ID || undefined,
      confidence: Math.min(confidence, 1),
    };
  }

  logger.info({ intent, confidence: result.data?.confidence, from }, "Hermes Agent parsed message");
  return result;
}

export function generateConfirmationMessage(result: ParsedAppointmentRequest, appointmentId: string): string {
  const date = result.appointmentDate
    ? new Date(result.appointmentDate + "T00:00:00").toLocaleDateString("en-IN", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      })
    : "the requested date";

  const time = result.preferredTime || "the requested time";

  return [
    `✅ *Appointment Confirmed!*`,
    ``,
    `Dear ${result.patientName || "Valued Patient"},`,
    ``,
    `Your appointment has been successfully booked.`,
    ``,
    `📋 *Appointment ID:* ${appointmentId}`,
    `📅 *Date:* ${date}`,
    `⏰ *Time:* ${time}`,
    `📝 *Reason:* ${result.reasonForVisit || "General consultation"}`,
    ``,
    `Please arrive 10 minutes before your scheduled time.`,
    ``,
    `Thank you for choosing us! 🙏`,
  ].join("\n");
}

export function generateMissingInfoMessage(missingFields: string[]): string {
  const fieldList = missingFields.map((f) => `  • ${f}`).join("\n");

  return [
    `*Hello!* 🤖`,
    ``,
    `I received your appointment request, but I need a few more details to proceed:`,
    ``,
    fieldList,
    ``,
    `Please reply with the missing information.`,
    ``,
    `You can also just say something like:`,
    `"Book appointment for John on Monday at 10 AM for a fever"`,
  ].join("\n");
}

export function generateHelpMessage(): string {
  return [
    `*Hermes Assistant* 🤖`,
    ``,
    `Here's what I can help you with:`,
    ``,
    `📅 *Book Appointment* — "Book an appointment for tomorrow at 10 AM"`,
    `❌ *Cancel Appointment* — "Cancel my appointment"`,
    `🔄 *Reschedule* — "Reschedule my appointment"`,
    `📊 *Check Status* — "What's the status of my appointment?"`,
    ``,
    `Just type naturally and I'll take care of the rest!`,
  ].join("\n");
}
