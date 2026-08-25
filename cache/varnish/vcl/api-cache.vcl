vcl 4.1;

sub vcl_recv_api {
  if (req.url ~ "^/api/dashboard") {
    set req.http.X-Cache-TTL = "120";
    return (hash);
  }
  if (req.url ~ "^/api/search\?q=") {
    set req.http.X-Cache-TTL = "60";
    return (hash);
  }
  if (req.url ~ "^/api/files/stats" || req.url ~ "^/api/files/recent") {
    set req.http.X-Cache-TTL = "300";
    return (hash);
  }
  if (req.url ~ "^/api/notifications/unread-count") {
    set req.http.X-Cache-TTL = "30";
    return (hash);
  }
}

sub vcl_backend_response_api {
  if (bereq.url ~ "^/api/dashboard") {
    set beresp.ttl = 2m;
  }
  if (bereq.url ~ "^/api/search") {
    set beresp.ttl = 1m;
  }
  if (bereq.url ~ "^/api/files/stats") {
    set beresp.ttl = 5m;
  }
}
