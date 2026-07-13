import mcpRoutes from "./routes/mcp.js";

// Load all tools (they self-register via imports)
import "./tools/profile.tool.js";
import "./tools/soul.tool.js";
import "./tools/engagement.tool.js";
import "./tools/stocks.tool.js";
import "./tools/appointment.tool.js";

export { mcpRoutes };
export { toolRegistry } from "./tools/registry.js";
export { mcpSessionManager } from "./session/manager.js";
export { mcpMemoryManager } from "./memory/manager.js";
export { MCPToolRegistry } from "./tools/registry.js";
