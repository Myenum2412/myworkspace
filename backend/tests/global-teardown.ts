export default async function globalTeardown(): Promise<void> {
  await (globalThis as any).__TEST_MONGODB_TEARDOWN__?.();
}
