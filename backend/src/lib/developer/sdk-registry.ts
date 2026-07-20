import { Schema, model, Document } from "mongoose";
import { v4 as uuid } from "uuid";
import crypto from "crypto";
import { logger } from "../logger/index.js";

export interface IApiEndpoint extends Document {
  id: string;
  orgId: string;
  path: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  name: string;
  description: string;
  version: string;
  tags: string[];
  auth: "none" | "api_key" | "session" | "oauth";
  requestSchema: Record<string, unknown>;
  responseSchema: Record<string, unknown>;
  parameters: {
    name: string; in: "path" | "query" | "header" | "body";
    required: boolean; type: string; description: string;
  }[];
  isActive: boolean;
  createdAt: Date;
}

export interface IIntegration extends Document {
  id: string;
  orgId: string;
  name: string;
  provider: string;
  type: "webhook" | "oauth" | "webhook_out" | "custom";
  config: Record<string, unknown>;
  status: "active" | "error" | "disabled";
  lastSyncAt?: Date;
  error?: string;
  createdBy: string;
  createdAt: Date;
}

export interface ISDKClient extends Document {
  id: string;
  orgId: string;
  name: string;
  language: "typescript" | "javascript" | "python" | "go" | "java" | "curl";
  version: string;
  endpoints: string[];
  generatedAt: Date;
  content: string;
}

const apiEndpointSchema = new Schema<IApiEndpoint>({
  id: { type: String, required: true, unique: true },
  orgId: { type: String, required: true, index: true },
  path: { type: String, required: true },
  method: { type: String, enum: ["GET", "POST", "PUT", "PATCH", "DELETE"], required: true },
  name: { type: String, required: true },
  description: { type: String, default: "" },
  version: { type: String, default: "1.0" },
  tags: [{ type: String }],
  auth: { type: String, enum: ["none", "api_key", "session", "oauth"], default: "api_key" },
  requestSchema: { type: Schema.Types.Mixed, default: {} },
  responseSchema: { type: Schema.Types.Mixed, default: {} },
  parameters: [{
    name: String,
    in: { type: String, enum: ["path", "query", "header", "body"] },
    required: Boolean, type: String, description: String,
  }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const integrationSchema = new Schema<IIntegration>({
  id: { type: String, required: true, unique: true },
  orgId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  provider: { type: String, required: true },
  type: { type: String, enum: ["webhook", "oauth", "webhook_out", "custom"], required: true },
  config: { type: Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ["active", "error", "disabled"], default: "active" },
  lastSyncAt: Date,
  error: String,
  createdBy: String,
}, { timestamps: true });

const sdkClientSchema = new Schema<ISDKClient>({
  id: { type: String, required: true, unique: true },
  orgId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  language: { type: String, enum: ["typescript", "javascript", "python", "go", "java", "curl"], required: true },
  version: { type: String, default: "1.0.0" },
  endpoints: [{ type: String }],
  generatedAt: { type: Date, default: Date.now },
  content: { type: String, default: "" },
});

export const ApiEndpoint = model<IApiEndpoint>("ApiEndpoint", apiEndpointSchema);
export const Integration = model<IIntegration>("Integration", integrationSchema);
export const SDKClient = model<ISDKClient>("SDKClient", sdkClientSchema);

export class SDKRegistry {
  async registerEndpoint(params: {
    orgId: string; path: string; method: IApiEndpoint["method"];
    name: string; description?: string; version?: string;
    tags?: string[]; auth?: IApiEndpoint["auth"];
    requestSchema?: Record<string, unknown>;
    responseSchema?: Record<string, unknown>;
    parameters?: IApiEndpoint["parameters"];
  }): Promise<IApiEndpoint> {
    return ApiEndpoint.create({
      id: uuid(), ...params,
      description: params.description || "",
      version: params.version || "1.0",
      tags: params.tags || [],
      auth: params.auth || "api_key",
      requestSchema: params.requestSchema || {},
      responseSchema: params.responseSchema || {},
      parameters: params.parameters || [],
      isActive: true,
    });
  }

  async searchEndpoints(orgId: string, query?: string): Promise<IApiEndpoint[]> {
    const filter: Record<string, unknown> = { orgId, isActive: true };
    if (query) {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { path: { $regex: escaped, $options: "i" } },
        { tags: { $regex: escaped, $options: "i" } },
        { description: { $regex: escaped, $options: "i" } },
      ];
    }
    return ApiEndpoint.find(filter).sort({ path: 1 }).lean() as any;
  }

  async registerIntegration(params: {
    orgId: string; name: string; provider: string;
    type: IIntegration["type"]; config?: Record<string, unknown>;
    createdBy: string;
  }): Promise<IIntegration> {
    return Integration.create({
      id: uuid(), ...params,
      config: params.config || {},
      status: "active",
    });
  }

  async getIntegrationsByOrg(orgId: string): Promise<{
    total: number; active: number; error: number;
    integrations: IIntegration[];
  }> {
    const [integrations, total, active, error] = await Promise.all([
      Integration.find({ orgId }).sort({ createdAt: -1 }).lean() as unknown as Promise<IIntegration[]>,
      Integration.countDocuments({ orgId }),
      Integration.countDocuments({ orgId, status: "active" }),
      Integration.countDocuments({ orgId, status: "error" }),
    ]);
    return { total, active, error, integrations };
  }

  async generateSDKClient(
    orgId: string,
    language: ISDKClient["language"],
    version?: string,
  ): Promise<ISDKClient> {
    const endpoints = await ApiEndpoint.find({ orgId, isActive: true }).lean();
    const ver = version || "1.0.0";

    let content = "";
    switch (language) {
      case "typescript":
        content = this.generateTypeScriptSDK(endpoints as any[], ver);
        break;
      case "python":
        content = this.generatePythonSDK(endpoints as any[], ver);
        break;
      case "curl":
        content = this.generateCurlExamples(endpoints as any[]);
        break;
      default:
        content = `// ${language} SDK for org ${orgId} - version ${ver}\n`;
    }

    return SDKClient.create({
      id: uuid(), orgId,
      name: `${language}-sdk-v${ver}`,
      language, version: ver,
      endpoints: endpoints.map(e => `${e.method} ${e.path}`),
      generatedAt: new Date(),
      content,
    });
  }

  private generateTypeScriptSDK(endpoints: any[], version: string): string {
    let sdk = `// Auto-generated TypeScript SDK v${version}\n`;
    sdk += `// Generated at ${new Date().toISOString()}\n\n`;
    sdk += `export class ApiClient {\n`;
    sdk += `  constructor(private baseUrl: string, private apiKey?: string) {}\n\n`;
    sdk += `  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {\n`;
    sdk += `    const headers: Record<string, string> = { "Content-Type": "application/json" };\n`;
    sdk += `    if (this.apiKey) headers["X-API-Key"] = this.apiKey;\n`;
    sdk += `    const res = await fetch(\`\${this.baseUrl}\${path}\`, { method, headers, body: body ? JSON.stringify(body) : undefined });\n`;
    sdk += `    if (!res.ok) throw new Error(\`API error: \${res.status}\`);\n`;
    sdk += `    return res.json();\n`;
    sdk += `  }\n\n`;

    for (const ep of endpoints) {
      const fnName = ep.name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
      const params = ep.parameters?.filter((p: any) => p.in === "path").map((p: any) => `${p.name}: ${p.type === "string" ? "string" : p.type === "number" ? "number" : "string"}`).join(", ");
      const sig = params ? `${fnName}(${params})` : `${fnName}()`;
      const path = ep.parameters?.filter((p: any) => p.in === "path").reduce((acc: string, p: any) => acc.replace(`{${p.name}}`, `\${${p.name}}`), ep.path) || ep.path;
      sdk += `  async ${sig}: Promise<any> {\n`;
      sdk += `    return this.request("${ep.method}", \`${path}\`);\n`;
      sdk += `  }\n\n`;
    }

    sdk += `}\n`;
    return sdk;
  }

  private generatePythonSDK(endpoints: any[], version: string): string {
    let sdk = `# Auto-generated Python SDK v${version}\n`;
    sdk += `# Generated at ${new Date().toISOString()}\n\n`;
    sdk += `import requests\n\n\n`;
    sdk += `class ApiClient:\n`;
    sdk += `    def __init__(self, base_url: str, api_key: str | None = None):\n`;
    sdk += `        self.base_url = base_url\n`;
    sdk += `        self.headers = {"Content-Type": "application/json"}\n`;
    sdk += `        if api_key:\n`;
    sdk += `            self.headers["X-API-Key"] = api_key\n\n`;

    for (const ep of endpoints) {
      const fnName = ep.name.replace(/[^a-zA-Z0-9_]/g, "_").lower();
      sdk += `    def ${fnName}(self):\n`;
      sdk += `        url = f"{self.base_url}${ep.path}"\n`;
      sdk += `        response = requests.request("${ep.method}", url, headers=self.headers)\n`;
      sdk += `        response.raise_for_status()\n`;
      sdk += `        return response.json()\n\n`;
    }
    return sdk;
  }

  private generateCurlExamples(endpoints: any[]): string {
    let examples = `# Curl Examples\n`;
    examples += `# Generated at ${new Date().toISOString()}\n\n`;
    for (const ep of endpoints) {
      examples += `# ${ep.name}\n`;
      examples += `curl -X ${ep.method} "https://api.example.com${ep.path}" \\\n`;
      examples += `  -H "Content-Type: application/json" \\\n`;
      examples += `  -H "X-API-Key: your-api-key"\n\n`;
    }
    return examples;
  }
}

export const sdkRegistry = new SDKRegistry();
