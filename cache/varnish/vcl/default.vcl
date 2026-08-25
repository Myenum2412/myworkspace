vcl 4.1;

import std;

# Backends
backend api_backend {
  .host = "nginx";
  .port = "80";
  .connect_timeout = 5s;
  .first_byte_timeout = 30s;
  .between_bytes_timeout = 10s;
  .max_connections = 500;
  .probe = {
    .url = "/api/health";
    .interval = 5s;
    .timeout = 3s;
    .window = 5;
    .threshold = 3;
  }
}

# ACL for PURGE requests
acl purge_acl {
  "localhost";
  "127.0.0.1";
  "10.0.0.0"/8;
  "172.16.0.0"/12;
  "192.168.0.0"/16;
}

sub vcl_recv {
  # Remove proxy headers
  unset req.http.X-Forwarded-For;
  set req.http.X-Forwarded-For = client.ip;

  # Handle PURGE requests
  if (req.method == "PURGE") {
    if (!client.ip ~ purge_acl) {
      return (synth(405, "Not allowed"));
    }
    if (req.http.X-Purge-Tag) {
      ban("obj.http.X-Cache-Tags ~ " + req.http.X-Purge-Tag);
      return (synth(200, "Purged by tag"));
    }
    return (purge);
  }

  # Handle BAN requests (pattern-based invalidation)
  if (req.method == "BAN") {
    if (!client.ip ~ purge_acl) {
      return (synth(405, "Not allowed"));
    }
    if (req.http.X-Ban-Pattern) {
      ban(req.http.X-Ban-Pattern);
      return (synth(200, "Banned"));
    }
    return (synth(400, "X-Ban-Pattern required"));
  }

  # Only cache GET and HEAD requests
  if (req.method != "GET" && req.method != "HEAD") {
    return (pass);
  }

  # Don't cache admin/orgmenu routes
  if (req.url ~ "^/orgmenu" || req.url ~ "^/admin") {
    return (pass);
  }

  # Don't cache auth endpoints
  if (req.url ~ "^/api/auth" || req.url ~ "^/api/client-auth") {
    return (pass);
  }

  # Don't cache WebSocket upgrades
  if (req.http.Upgrade ~ "(?i)websocket") {
    return (pass);
  }

  # Cache static assets aggressively
  if (req.url ~ "\.(css|js|svg|png|jpg|jpeg|gif|ico|webp|woff2?|ttf|eot|pdf)$") {
    unset req.http.Cookie;
    return (hash);
  }

  # Cache API GET requests with query parameters
  if (req.url ~ "^/api/(dashboard|search|files|tasks|projects|teams|clients|notifications|activity|time-entries|billing)") {
    unset req.http.Cookie;
    return (hash);
  }

  # Pass through requests with authorization headers (user-specific data)
  if (req.http.Authorization || req.http.Cookie ~ "(authjs|next-auth|__session)") {
    return (pass);
  }

  # Default: don't cache authenticated requests
  return (pass);
}

sub vcl_hash {
  hash_data(req.url);
  if (req.http.host) {
    hash_data(req.http.host);
  }
  # Vary on key headers for API versioning
  if (req.http.Accept) {
    hash_data(req.http.Accept);
  }
  return (lookup);
}

sub vcl_backend_response {
  # Set TTL based on content type
  if (beresp.http.Content-Type ~ "image/") {
    set beresp.ttl = 7d;
    set beresp.grace = 24h;
  } else if (beresp.http.Content-Type ~ "application/javascript" || beresp.http.Content-Type ~ "text/css") {
    set beresp.ttl = 7d;
    set beresp.grace = 24h;
  } else if (beresp.http.Content-Type ~ "text/html") {
    set beresp.ttl = 5m;
    set beresp.grace = 1h;
  } else if (beresp.http.Content-Type ~ "application/json") {
    set beresp.ttl = 2m;
    set beresp.grace = 10m;
  }

  # Default TTL
  if (beresp.ttl <= 0s) {
    set beresp.ttl = 30s;
  }

  # Allow backend to set cache control
  if (beresp.http.Cache-Control) {
    if (beresp.http.Cache-Control ~ "no-cache" || beresp.http.Cache-Control ~ "private") {
      set beresp.uncacheable = true;
      return (deliver);
    }
    if (beresp.http.Cache-Control ~ "max-age=(\d+)") {
      set beresp.ttl = std.duration(regsub(beresp.http.Cache-Control, ".*max-age=(\d+).*", "\1s"), 30s);
    }
  }

  # Add cache tags for tag-based invalidation
  if (beresp.http.X-Cache-Tags) {
    set beresp.http.X-Cache-Tags = beresp.http.X-Cache-Tags;
  }

  # Strip cookies from cacheable responses
  unset beresp.http.Set-Cookie;
  unset beresp.http.X-Powered-By;

  return (deliver);
}

sub vcl_deliver {
  # Add cache hit/miss headers
  if (obj.hits > 0) {
    set resp.http.X-Cache = "HIT";
    set resp.http.X-Cache-Hits = obj.hits;
  } else {
    set resp.http.X-Cache = "MISS";
  }

  # Add age header
  set resp.http.X-Age = obj.age;

  # Remove internal headers
  unset resp.http.X-Varnish;
  unset resp.http.Via;
  unset resp.http.X-Cache-Tags;

  return (deliver);
}

sub vcl_backend_error {
  return (deliver);
}

sub vcl_hit {
  if (obj.ttl <= 0s && std.healthy(req.backend_hint)) {
    return (restart);
  }
  return (deliver);
}

sub vcl_miss {
  return (fetch);
}

sub vcl_synth {
  set resp.http.Content-Type = "application/json; charset=utf-8";
  set resp.http.Retry-After = "5";
  synthetic({"{\"success\":false}"});
  return (deliver);
}
