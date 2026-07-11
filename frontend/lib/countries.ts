export interface Country {
  code: string;
  iso: string;
  name: string;
  flag: string;
}

export const countries: Country[] = [
  { code: "+1", iso: "US", name: "United States", flag: "🇺🇸" },
  { code: "+1", iso: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "+7", iso: "RU", name: "Russia", flag: "🇷🇺" },
  { code: "+20", iso: "EG", name: "Egypt", flag: "🇪🇬" },
  { code: "+27", iso: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "+30", iso: "GR", name: "Greece", flag: "🇬🇷" },
  { code: "+31", iso: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "+32", iso: "BE", name: "Belgium", flag: "🇧🇪" },
  { code: "+33", iso: "FR", name: "France", flag: "🇫🇷" },
  { code: "+34", iso: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "+36", iso: "HU", name: "Hungary", flag: "🇭🇺" },
  { code: "+39", iso: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "+40", iso: "RO", name: "Romania", flag: "🇷🇴" },
  { code: "+41", iso: "CH", name: "Switzerland", flag: "🇨🇭" },
  { code: "+43", iso: "AT", name: "Austria", flag: "🇦🇹" },
  { code: "+44", iso: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "+45", iso: "DK", name: "Denmark", flag: "🇩🇰" },
  { code: "+46", iso: "SE", name: "Sweden", flag: "🇸🇪" },
  { code: "+47", iso: "NO", name: "Norway", flag: "🇳🇴" },
  { code: "+48", iso: "PL", name: "Poland", flag: "🇵🇱" },
  { code: "+49", iso: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "+51", iso: "PE", name: "Peru", flag: "🇵🇪" },
  { code: "+52", iso: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "+53", iso: "CU", name: "Cuba", flag: "🇨🇺" },
  { code: "+54", iso: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "+55", iso: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "+56", iso: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "+57", iso: "CO", name: "Colombia", flag: "🇨🇴" },
  { code: "+58", iso: "VE", name: "Venezuela", flag: "🇻🇪" },
  { code: "+60", iso: "MY", name: "Malaysia", flag: "🇲🇾" },
  { code: "+61", iso: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "+62", iso: "ID", name: "Indonesia", flag: "🇮🇩" },
  { code: "+63", iso: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "+64", iso: "NZ", name: "New Zealand", flag: "🇳🇿" },
  { code: "+65", iso: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "+66", iso: "TH", name: "Thailand", flag: "🇹🇭" },
  { code: "+81", iso: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "+82", iso: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "+84", iso: "VN", name: "Vietnam", flag: "🇻🇳" },
  { code: "+86", iso: "CN", name: "China", flag: "🇨🇳" },
  { code: "+90", iso: "TR", name: "Turkey", flag: "🇹🇷" },
  { code: "+91", iso: "IN", name: "India", flag: "🇮🇳" },
  { code: "+92", iso: "PK", name: "Pakistan", flag: "🇵🇰" },
  { code: "+93", iso: "AF", name: "Afghanistan", flag: "🇦🇫" },
  { code: "+94", iso: "LK", name: "Sri Lanka", flag: "🇱🇰" },
  { code: "+95", iso: "MM", name: "Myanmar", flag: "🇲🇲" },
  { code: "+98", iso: "IR", name: "Iran", flag: "🇮🇷" },
  { code: "+212", iso: "MA", name: "Morocco", flag: "🇲🇦" },
  { code: "+213", iso: "DZ", name: "Algeria", flag: "🇩🇿" },
  { code: "+216", iso: "TN", name: "Tunisia", flag: "🇹🇳" },
  { code: "+220", iso: "GM", name: "Gambia", flag: "🇬🇲" },
  { code: "+221", iso: "SN", name: "Senegal", flag: "🇸🇳" },
  { code: "+234", iso: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "+254", iso: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "+255", iso: "TZ", name: "Tanzania", flag: "🇹🇿" },
  { code: "+256", iso: "UG", name: "Uganda", flag: "🇺🇬" },
  { code: "+260", iso: "ZM", name: "Zambia", flag: "🇿🇲" },
  { code: "+263", iso: "ZW", name: "Zimbabwe", flag: "🇿🇼" },
  { code: "+351", iso: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "+352", iso: "LU", name: "Luxembourg", flag: "🇱🇺" },
  { code: "+353", iso: "IE", name: "Ireland", flag: "🇮🇪" },
  { code: "+354", iso: "IS", name: "Iceland", flag: "🇮🇸" },
  { code: "+355", iso: "AL", name: "Albania", flag: "🇦🇱" },
  { code: "+356", iso: "MT", name: "Malta", flag: "🇲🇹" },
  { code: "+357", iso: "CY", name: "Cyprus", flag: "🇨🇾" },
  { code: "+358", iso: "FI", name: "Finland", flag: "🇫🇮" },
  { code: "+359", iso: "BG", name: "Bulgaria", flag: "🇧🇬" },
  { code: "+370", iso: "LT", name: "Lithuania", flag: "🇱🇹" },
  { code: "+371", iso: "LV", name: "Latvia", flag: "🇱🇻" },
  { code: "+372", iso: "EE", name: "Estonia", flag: "🇪🇪" },
  { code: "+373", iso: "MD", name: "Moldova", flag: "🇲🇩" },
  { code: "+374", iso: "AM", name: "Armenia", flag: "🇦🇲" },
  { code: "+375", iso: "BY", name: "Belarus", flag: "🇧🇾" },
  { code: "+380", iso: "UA", name: "Ukraine", flag: "🇺🇦" },
  { code: "+381", iso: "RS", name: "Serbia", flag: "🇷🇸" },
  { code: "+385", iso: "HR", name: "Croatia", flag: "🇭🇷" },
  { code: "+386", iso: "SI", name: "Slovenia", flag: "🇸🇮" },
  { code: "+387", iso: "BA", name: "Bosnia & Herzegovina", flag: "🇧🇦" },
  { code: "+389", iso: "MK", name: "North Macedonia", flag: "🇲🇰" },
  { code: "+420", iso: "CZ", name: "Czech Republic", flag: "🇨🇿" },
  { code: "+421", iso: "SK", name: "Slovakia", flag: "🇸🇰" },
  { code: "+501", iso: "BZ", name: "Belize", flag: "🇧🇿" },
  { code: "+502", iso: "GT", name: "Guatemala", flag: "🇬🇹" },
  { code: "+503", iso: "SV", name: "El Salvador", flag: "🇸🇻" },
  { code: "+504", iso: "HN", name: "Honduras", flag: "🇭🇳" },
  { code: "+505", iso: "NI", name: "Nicaragua", flag: "🇳🇮" },
  { code: "+506", iso: "CR", name: "Costa Rica", flag: "🇨🇷" },
  { code: "+507", iso: "PA", name: "Panama", flag: "🇵🇦" },
  { code: "+509", iso: "HT", name: "Haiti", flag: "🇭🇹" },
  { code: "+591", iso: "BO", name: "Bolivia", flag: "🇧🇴" },
  { code: "+592", iso: "GY", name: "Guyana", flag: "🇬🇾" },
  { code: "+593", iso: "EC", name: "Ecuador", flag: "🇪🇨" },
  { code: "+594", iso: "GF", name: "French Guiana", flag: "🇬🇫" },
  { code: "+595", iso: "PY", name: "Paraguay", flag: "🇵🇾" },
  { code: "+596", iso: "MQ", name: "Martinique", flag: "🇲🇶" },
  { code: "+597", iso: "SR", name: "Suriname", flag: "🇸🇷" },
  { code: "+598", iso: "UY", name: "Uruguay", flag: "🇺🇾" },
  { code: "+599", iso: "CW", name: "Curaçao", flag: "🇨🇼" },
  { code: "+852", iso: "HK", name: "Hong Kong", flag: "🇭🇰" },
  { code: "+853", iso: "MO", name: "Macau", flag: "🇲🇴" },
  { code: "+855", iso: "KH", name: "Cambodia", flag: "🇰🇭" },
  { code: "+856", iso: "LA", name: "Laos", flag: "🇱🇦" },
  { code: "+880", iso: "BD", name: "Bangladesh", flag: "🇧🇩" },
  { code: "+886", iso: "TW", name: "Taiwan", flag: "🇹🇼" },
  { code: "+960", iso: "MV", name: "Maldives", flag: "🇲🇻" },
  { code: "+961", iso: "LB", name: "Lebanon", flag: "🇱🇧" },
  { code: "+962", iso: "JO", name: "Jordan", flag: "🇯🇴" },
  { code: "+963", iso: "SY", name: "Syria", flag: "🇸🇾" },
  { code: "+964", iso: "IQ", name: "Iraq", flag: "🇮🇶" },
  { code: "+965", iso: "KW", name: "Kuwait", flag: "🇰🇼" },
  { code: "+966", iso: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+967", iso: "YE", name: "Yemen", flag: "🇾🇪" },
  { code: "+968", iso: "OM", name: "Oman", flag: "🇴🇲" },
  { code: "+971", iso: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "+972", iso: "IL", name: "Israel", flag: "🇮🇱" },
  { code: "+973", iso: "BH", name: "Bahrain", flag: "🇧🇭" },
  { code: "+974", iso: "QA", name: "Qatar", flag: "🇶🇦" },
  { code: "+975", iso: "BT", name: "Bhutan", flag: "🇧🇹" },
  { code: "+976", iso: "MN", name: "Mongolia", flag: "🇲🇳" },
  { code: "+977", iso: "NP", name: "Nepal", flag: "🇳🇵" },
  { code: "+992", iso: "TJ", name: "Tajikistan", flag: "🇹🇯" },
  { code: "+993", iso: "TM", name: "Turkmenistan", flag: "🇹🇲" },
  { code: "+994", iso: "AZ", name: "Azerbaijan", flag: "🇦🇿" },
  { code: "+995", iso: "GE", name: "Georgia", flag: "🇬🇪" },
  { code: "+996", iso: "KG", name: "Kyrgyzstan", flag: "🇰🇬" },
  { code: "+998", iso: "UZ", name: "Uzbekistan", flag: "🇺🇿" },
];

export function getCountryByCode(code: string): Country | undefined {
  return countries.find((c) => c.code === code);
}

export function getCountryByIso(iso: string): Country | undefined {
  return countries.find((c) => c.iso === iso);
}

export function parsePhone(value: string, defaultCode = "+91"): { countryCode: string; localNumber: string } {
  if (!value) return { countryCode: defaultCode, localNumber: "" };
  const trimmed = value.trim();
  if (trimmed.startsWith("+")) {
    const sorted = [...countries].sort((a, b) => b.code.length - a.code.length);
    for (const c of sorted) {
      if (trimmed.startsWith(c.code)) {
        return { countryCode: c.code, localNumber: trimmed.slice(c.code.length) };
      }
    }
  }
  return { countryCode: defaultCode, localNumber: trimmed };
}

export function formatPhone(countryCode: string, localNumber: string): string {
  const num = localNumber.trim();
  if (!num) return "";
  return `${countryCode}${num}`;
}
