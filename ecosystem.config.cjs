module.exports = {
  apps: [
    {
      name: "myworkspace-backend",
      script: "dist/index.js",
      cwd: "./backend",
      env: {
        NODE_ENV: "production",
        HOST: "127.0.0.1",
        PORT: 4000,
      },
      env_file: "./backend/.env",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "1G",
      error_file: "./logs/backend-error.log",
      out_file: "./logs/backend-out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
