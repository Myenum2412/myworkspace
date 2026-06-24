import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import React from "react";
import { indexedDB, IDBKeyRange } from "fake-indexeddb";

if (typeof globalThis.indexedDB === "undefined") {
  (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = indexedDB;
  (globalThis as unknown as { IDBKeyRange: typeof IDBKeyRange }).IDBKeyRange = IDBKeyRange;
}

vi.mock("next/navigation", () => ({
  usePathname: () => "/staffs",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: React.forwardRef(function Link(
    { children, href, ...props }: { children: React.ReactNode; href: string },
    ref: React.Ref<HTMLAnchorElement>
  ) {
    return React.createElement("a", { ref, href, ...props }, children);
  }),
}));

vi.mock("next/image", () => ({
  default: function Image({ src, alt, ...props }: { src: string; alt: string }) {
    return React.createElement("img", { src, alt, ...props });
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  auth: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

