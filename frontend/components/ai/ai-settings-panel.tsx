"use client";

import { useAISettings } from "@/hooks/ai/use-ai-settings";
import { AISettings } from "@/lib/services/ai/ai-service";
import { useState } from "react";
import { Save, Loader2 } from "lucide-react";

export function AiSettingsPanel() {
  const { settings, isLoading, updateSettings, isUpdating } = useAISettings();
  const [form, setForm] = useState<Partial<AISettings> | null>(null);

  const current = form || settings;
  if (!current) return null;

  const handleSave = async () => {
    if (form) {
      await updateSettings(form);
      setForm(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">AI Settings</h3>
        <p className="text-sm text-muted-foreground">Configure AI provider and behavior for your workspace.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">AI Provider</label>
          <select
            value={current.provider || "openrouter"}
            onChange={(e) => setForm({ ...current, provider: e.target.value as any })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="openrouter">OpenRouter</option>
            <option value="openai">OpenAI</option>
            <option value="claude">Anthropic Claude</option>
            <option value="azure">Azure OpenAI</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Model</label>
          <input
            value={current.model || ""}
            onChange={(e) => setForm({ ...current, model: e.target.value })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Temperature (0-2)</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={current.temperature ?? 0.7}
              onChange={(e) => setForm({ ...current, temperature: parseFloat(e.target.value) })}
              className="flex-1"
            />
            <span className="text-sm font-mono w-8 text-right">{current.temperature?.toFixed(1)}</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Max Tokens</label>
          <input
            type="number"
            min={256}
            max={128000}
            step={256}
            value={current.maxTokens ?? 4096}
            onChange={(e) => setForm({ ...current, maxTokens: parseInt(e.target.value) })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Response Length</label>
          <select
            value={current.responseLength || "medium"}
            onChange={(e) => setForm({ ...current, responseLength: e.target.value as any })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="short">Short</option>
            <option value="medium">Medium</option>
            <option value="long">Long</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Streaming Mode</label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={current.streamingEnabled ?? true}
              onChange={(e) => setForm({ ...current, streamingEnabled: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Enable streaming responses</span>
          </label>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Rate Limit (requests/min)</label>
          <input
            type="number"
            min={1}
            value={current.rateLimitRequests ?? 100}
            onChange={(e) => setForm({ ...current, rateLimitRequests: parseInt(e.target.value) })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Conversation Retention (days)</label>
          <input
            type="number"
            min={1}
            max={365}
            value={current.conversationRetentionDays ?? 90}
            onChange={(e) => setForm({ ...current, conversationRetentionDays: parseInt(e.target.value) })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">System Prompt</label>
        <textarea
          value={current.systemPrompt || ""}
          onChange={(e) => setForm({ ...current, systemPrompt: e.target.value })}
          rows={5}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Allowed File Types</label>
        <input
          value={(current.allowedFileTypes || []).join(", ")}
          onChange={(e) => setForm({ ...current, allowedFileTypes: e.target.value.split(",").map(s => s.trim()) })}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="pdf, docx, xlsx, csv, png, jpg"
        />
      </div>

      {form && (
        <button
          onClick={handleSave}
          disabled={isUpdating}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Settings
        </button>
      )}
    </div>
  );
}
