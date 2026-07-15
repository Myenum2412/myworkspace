import { TokenCounter } from "../../../../src/services/ai/token-counter.service.js";

describe("TokenCounter", () => {
  let counter: TokenCounter;

  beforeEach(() => {
    counter = new TokenCounter();
  });

  it("estimates token count based on character length", () => {
    const tokens = counter.estimateTokenCount("Hello, world!");
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeLessThanOrEqual(10);
  });

  it("returns 0 for empty text", () => {
    expect(counter.estimateTokenCount("")).toBe(0);
  });

  it("estimates message tokens including overhead", () => {
    const messages = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there!" },
    ];
    const tokens = counter.estimateMessageTokens(messages);
    expect(tokens).toBeGreaterThan(0);
  });

  it("counts prompt tokens", () => {
    const messages = [{ role: "user", content: "Test prompt" }];
    const tokens = counter.countPromptTokens(messages);
    expect(tokens).toBeGreaterThan(0);
  });

  it("counts completion tokens", () => {
    const tokens = counter.countCompletionTokens("This is a test response with multiple words.");
    expect(tokens).toBeGreaterThan(0);
  });

  it("truncates text that exceeds max tokens", () => {
    const longText = "a".repeat(1000);
    const truncated = counter.truncateToMaxTokens(longText, 10);
    expect(truncated.length).toBeLessThan(longText.length);
    expect(truncated).toContain("[Content truncated...]");
  });

  it("does not truncate text within limits", () => {
    const text = "Short text";
    const result = counter.truncateToMaxTokens(text, 100);
    expect(result).toBe(text);
  });

  it("checks if text is within token limit", () => {
    expect(counter.isWithinLimit("Short", 100)).toBe(true);
    expect(counter.isWithinLimit("a".repeat(1000), 10)).toBe(false);
  });
});
