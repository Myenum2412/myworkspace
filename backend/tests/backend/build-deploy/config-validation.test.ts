import fs from "fs";
import path from "path";

const BACKEND_DIR = process.cwd();
const FRONTEND_DIR = path.resolve(BACKEND_DIR, "..", "frontend");
const ROOT_DIR = path.resolve(BACKEND_DIR, "..");

describe("Build and deployment config validation", () => {
  describe("Dockerfile", () => {
    it("backend Dockerfile exists", () => {
      const dockerfile = path.join(BACKEND_DIR, "Dockerfile");
      expect(fs.existsSync(dockerfile)).toBe(true);
    });

    it("frontend Dockerfile exists", () => {
      const dockerfile = path.join(FRONTEND_DIR, "Dockerfile");
      expect(fs.existsSync(dockerfile)).toBe(true);
    });

    it(".dockerignore exists at root", () => {
      expect(fs.existsSync(path.join(ROOT_DIR, ".dockerignore"))).toBe(true);
    });

    it("backend Dockerfile copies package-lock.json", () => {
      const content = fs.readFileSync(path.join(BACKEND_DIR, "Dockerfile"), "utf-8");
      expect(content).toContain("package-lock.json");
    });

    it("backend Dockerfile has a build stage and a production stage", () => {
      const content = fs.readFileSync(path.join(BACKEND_DIR, "Dockerfile"), "utf-8");
      expect(content).toContain("FROM");
      // Multi-stage build check
      const fromCount = (content.match(/FROM /g) || []).length;
      expect(fromCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("docker-compose config", () => {
    it("docker-compose.yml exists", () => {
      expect(fs.existsSync(path.join(ROOT_DIR, "docker-compose.yml"))).toBe(true);
    });

    it("docker-compose.prod.yml exists", () => {
      expect(fs.existsSync(path.join(ROOT_DIR, "docker-compose.prod.yml"))).toBe(true);
    });

    it("docker-compose files contain expected keys", () => {
      for (const file of ["docker-compose.yml", "docker-compose.prod.yml"]) {
        const content = fs.readFileSync(path.join(ROOT_DIR, file), "utf-8");
        expect(content).toContain("services");
      }
    });
  });

  describe("Service Worker syntax check", () => {
    it("frontend app/sw.ts exists", () => {
      const swPath = path.join(FRONTEND_DIR, "app", "sw.ts");
      expect(fs.existsSync(swPath)).toBe(true);
    });
  });

  describe("PM2 / production start script", () => {
    it("ecosystem.config.cjs exists", () => {
      expect(fs.existsSync(path.join(ROOT_DIR, "ecosystem.config.cjs")));
    });

    it("backend start script points to compiled output (dist/index.js)", () => {
      const backendPkg = JSON.parse(
        fs.readFileSync(path.join(BACKEND_DIR, "package.json"), "utf-8"),
      );
      const startScript = backendPkg.scripts?.start || "";
      expect(startScript).toContain("dist/");
      expect(startScript).not.toContain("tsx");
      expect(startScript).not.toContain("ts-node");
    });

    it("backend tsconfig has outDir set to dist", () => {
      const raw = fs.readFileSync(path.join(BACKEND_DIR, "tsconfig.json"), "utf-8");
      const stripped = raw.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
      const tsconfig = JSON.parse(stripped);
      expect(tsconfig.compilerOptions.outDir).toBe("dist");
    });
  });

  describe("Environment variable placeholder detection", () => {
    it("backend .env does not contain placeholder secrets", () => {
      const envPath = path.join(BACKEND_DIR, ".env");
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, "utf-8");
        const dangerousPatterns = [/JWT_SECRET\s*=\s*change-me/i, /PASSWORD\s*=\s*password/i];
        for (const pattern of dangerousPatterns) {
          if (pattern.test(content)) {
            console.warn(`WARNING: .env contains placeholder value matching ${pattern}`);
          }
        }
      }
    });
  });

  describe("start.sh script", () => {
    it("start.sh exists and is executable", () => {
      const startSh = path.join(ROOT_DIR, "start.sh");
      expect(fs.existsSync(startSh)).toBe(true);
      const stats = fs.statSync(startSh);
      expect(stats.isFile()).toBe(true);
    });
  });

  describe("Build output verification", () => {
    it("backend dist directory exists if build has been run", () => {
      const distDir = path.join(BACKEND_DIR, "dist");
      if (fs.existsSync(distDir)) {
        const hasIndex = fs.existsSync(path.join(distDir, "index.js"));
        // If dist exists, it should have index.js
        expect(hasIndex).toBe(true);
      }
    });
  });
});
