import Link from "next/link";

const footerLinks = [
  {
    title: "Product",
    links: ["Features", "Pricing", "Integrations", "Changelog"],
  },
  {
    title: "Company",
    links: ["About", "Blog", "Careers", "Contact"],
  },
  {
    title: "Support",
    links: ["Documentation", "API Reference", "Status", "Help Center"],
  },
  {
    title: "Legal",
    links: ["Privacy", "Terms", "Security", "Cookies"],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-brand-200/60 bg-white safe-paddings">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4">
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h4 className="text-sm font-semibold text-brand-900">
                {group.title}
              </h4>
              <ul className="mt-4 space-y-2">
                {group.links.map((link) => (
                  <li key={link}>
                    <Link
                      href="#"
                      className="touch-target flex items-center text-sm text-brand-600 transition-colors hover:text-brand-800"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-brand-200/60 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2 min-h-[44px]">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-800">
                <span className="text-xs font-bold text-white">M</span>
              </div>
              <span className="text-sm font-medium text-brand-900">
                MyWorkSpace
              </span>
            </div>
            <p className="text-sm text-brand-400">
              &copy; {new Date().getFullYear()} MyWorkSpace. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
