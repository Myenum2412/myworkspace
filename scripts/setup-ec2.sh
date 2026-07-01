#!/bin/bash
set -e

echo "========================================"
echo "  MyWorkspace — AWS EC2 Setup"
echo "========================================"

# ── Prerequisites ──────────────────────────────────
sudo apt-get update -y
sudo apt-get install -y curl git build-essential

# ── Node.js 22 ─────────────────────────────────────
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# ── PM2 ────────────────────────────────────────────
if ! command -v pm2 &>/dev/null; then
  sudo npm install -g pm2
fi

# ── MongoDB (optional — use Atlas instead) ─────────
# If using local MongoDB:
# curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
# echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
# sudo apt-get update -y && sudo apt-get install -y mongodb-org && sudo systemctl enable mongod && sudo systemctl start mongod

# ── Redis (required) ───────────────────────────────
if ! command -v redis-server &>/dev/null; then
  sudo apt-get install -y redis-server
  sudo systemctl enable redis-server
  sudo systemctl start redis-server
fi

# ── RabbitMQ (required for queues) ─────────────────
if ! command -v rabbitmq-server &>/dev/null; then
  curl -fsSL https://packages.erlang-solutions.com/erlang-solutions_2.0_all.deb -o /tmp/erlang.deb
  sudo dpkg -i /tmp/erlang.deb 2>/dev/null || true
  sudo apt-get update -y
  sudo apt-get install -y erlang
  curl -fsSL https://github.com/rabbitmq/rabbitmq-server/releases/download/v4.0.5/rabbitmq-server_4.0.5-1_all.deb -o /tmp/rabbitmq.deb
  sudo dpkg -i /tmp/rabbitmq.deb 2>/dev/null || sudo apt-get install -y -f
  sudo systemctl enable rabbitmq-server
  sudo systemctl start rabbitmq-server
fi

# ── Caddy (reverse proxy, HTTPS auto) ──────────────
if ! command -v caddy &>/dev/null; then
  sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
  sudo apt-get update -y
  sudo apt-get install -y caddy
  sudo systemctl enable caddy
fi

# ── App directory ──────────────────────────────────
sudo mkdir -p /var/www/myworkspace/shared
sudo chown -R ubuntu:ubuntu /var/www/myworkspace

# ── PM2 startup ────────────────────────────────────
pm2 startup systemd -u ubuntu --hp /home/ubuntu || true

echo ""
echo "========================================"
echo "  EC2 Setup Complete"
echo "========================================"
echo ""
echo "Next steps:"
echo "  1. Create /var/www/myworkspace/shared/.env with production env vars"
echo "  2. Copy backend/.env.example and frontend/.env.example for reference"
echo "  3. Push to main branch — GitHub Actions will deploy automatically"
echo "  4. Verify at https://myworkspace.myenum.in"
echo ""
echo "Required GitHub Secrets:"
echo "  EC2_SSH_KEY   — private SSH key for ubuntu@YOUR_EC2_IP"
echo "  EC2_HOST      — your EC2 public IP or domain"
echo "  EC2_USER      — ubuntu (default)"
echo "  EC2_DEPLOY_PATH — /var/www/myworkspace"
echo "  APP_URL       — https://myworkspace.myenum.in"
echo "  MONGODB_URI   — MongoDB connection string"
echo "  NEXTAUTH_SECRET — random string for NextAuth"
