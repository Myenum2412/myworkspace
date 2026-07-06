module.exports = {
  apps: [
    {
      name: "myworkspace-backend",
      script: "dist/index.js",
      args: "--env-file=.env",
      cwd: "./backend",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
        HOST: "127.0.0.1",
        PORT: process.env.PORT || 4000,
      },
    }
  ],
  deploy: {
    backend_production_server: {
      user: "ubuntu",
      host: "16.171.239.167",
      ref: "origin/main",
      repo: "git@github.com:Myenum2412/myworkspace.git",
      path: "/var/www/myworkspace-backend",
      "post-deploy":
        "cp /var/www/myworkspace-backend/shared/.env /var/www/myworkspace-backend/current/backend/.env && cd backend && rm -rf node_modules dist && NODE_OPTIONS=\"--max-old-space-size=2048\" npm ci && NODE_OPTIONS=\"--max-old-space-size=2048\" npm run build && cd /var/www/myworkspace-backend/current && pm2 delete myworkspace-backend 2>/dev/null; true && pm2 start ecosystem.config.cjs --only myworkspace-backend && pm2 save",
    },
  }
};