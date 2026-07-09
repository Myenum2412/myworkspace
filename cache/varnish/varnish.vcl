vcl 4.1;

import directors;
import std;

backend backend {
  .host = "backend";
  .port = "4000";
  .connect_timeout = 5s;
  .first_byte_timeout = 30s;
  .between_bytes_timeout = 10s;
  .max_connections = 500;
}

backend frontend {
  .host = "frontend";
  .port = "3000";
  .connect_timeout = 5s;
  .first_byte_timeout = 30s;
  .between_bytes_timeout = 10s;
  .max_connections = 500;
}

sub vcl_init {
  new cluster = directors.round_robin();
  cluster.add_backend(backend);
  cluster.add_backend(frontend);
}

acl purge {
  "localhost";
  "127.0.0.1";
  "::1";
  "backend";
  "nginx";
}

sub vcl_recv {
  # Normalize host
  if (req.http.host ~ "^www\.") {
    set req.http.host = regsub(req.http.host, "^www\.", "");
  }

  # Forwarded IP
  if (req.http.x-forwarded-for) {
    set req.http.X-Forwarded-For = req.http.X-Forwarded-For + ", " + client.ip;
  } else {
    set req.http.X-Forwarded-For = client.ip;
  }

  # Only cache GET and HEAD
  if (req.method != "GET" && req.method != "HEAD") {
    return (pass);
  }

  # Health check endpoint — never cache, but respond fast
  if (req.url == "/api/health") {
    return (pass);
  }

  # Strip cookies for static assets
  if (req.url ~ "^/(_next/static|uploads|banners|fonts)/" ||
      req.url ~ "\.(js|css|svg|png|jpg|jpeg|gif|ico|webp|avif|woff2?|ttf|eot|otf|pdf)$") {
    unset req.http.cookie;
    return (hash);
  }

  # Strip cookies for API GET requests that are cacheable
  if (req.url ~ "^/api/" && req.method == "GET") {
    # Don't cache auth requests
    if (req.url ~ "^/api/(auth|files-tus|billing/webhook)") {
      return (pass);
    }

    # Cache dashboard, search, and settings with cookie stripped
    if (req.url ~ "^/api/(dashboard|search|settings|reports/activity)") {
      unset req.http.cookie;
      return (hash);
    }

    return (pass);
  }

  # Default: pass through
  return (pass);
}

sub vcl_hash {
  hash_data(req.url);
  if (req.http.host) {
    hash_data(req.http.host);
  }
  return (lookup);
}

sub vcl_backend_response {
  # Set TTLs based on content type
  if (beresp.http.content-type ~ "^(text/css|application/javascript|application/x-javascript)") {
    set beresp.ttl = 365d;
    set beresp.http.Cache-Control = "public, immutable, max-age=31536000";
  } elsif (beresp.http.content-type ~ "^(image/|font/)") {
    set beresp.ttl = 365d;
    set beresp.http.Cache-Control = "public, immutable, max-age=31536000";
  } elsif (beresp.http.content-type ~ "^application/json") {
    if (bereq.url ~ "^/api/dashboard") {
      set beresp.ttl = 120s;
      set beresp.grace = 600s;
      set beresp.keep = 3600s;
    } elsif (bereq.url ~ "^/api/settings") {
      set beresp.ttl = 300s;
      set beresp.grace = 1800s;
    } elsif (bereq.url ~ "^/api/search") {
      set beresp.ttl = 60s;
      set beresp.grace = 300s;
    } else {
      set beresp.ttl = 30s;
      set beresp.grace = 120s;
    }
  } else {
    # HTML and other content — short TTL
    set beresp.ttl = 60s;
    set beresp.grace = 300s;
  }

  # Ensure we have a grace period for stale-while-revalidate
  if (beresp.grace == 0s) {
    set beresp.grace = 120s;
  }

  # Remove Set-Cookie for cached responses
  if (beresp.ttl > 0s) {
    unset beresp.http.set-cookie;
  }

  # Add cache status
  set beresp.http.X-Cache-TTL = beresp.ttl;
  set beresp.http.X-Cache-Grace = beresp.grace;
}

sub vcl_deliver {
  # Add cache hit/miss status
  if (obj.hits > 0) {
    set resp.http.X-Cache = "HIT";
    set resp.http.X-Cache-Hits = obj.hits;
  } else {
    set resp.http.X-Cache = "MISS";
  }

  # Remove Varnish-specific headers in production
  if (!std.healthy(req.backend_hint)) {
    set resp.http.X-Cache-Health = "degraded";
  }

  # Remove internal headers
  unset resp.http.X-Varnish;
  unset resp.http.Via;
}

sub vcl_hit {
  if (obj.ttl >= 0s) {
    return (deliver);
  }

  # Stale-while-revalidate
  if (std.healthy(req.backend_hint)) {
    if (obj.ttl + obj.grace > 0s) {
      return (deliver);
    }
  }

  return (miss);
}

sub vcl_miss {
  return (fetch);
}

sub vcl_purge {
  return (synth(200, "Purged"));
}

sub vcl_synth {
  set resp.http.Content-Type = "application/json; charset=utf-8";
  set resp.http.Retry-After = "5";
  synthetic({"
    {"success":false,"status":"degraded"}
  "});
  return (deliver);
}