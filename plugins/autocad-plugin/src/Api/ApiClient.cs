using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using MyWorkspacePlugin.Data;

namespace MyWorkspacePlugin.Api
{
    public class UploadResult
    {
        public bool Success { get; set; }
        public string? DrawingId { get; set; }
        public int EntityCount { get; set; }
        public int StatusCode { get; set; }
        public string? Error { get; set; }
        public string? RawResponse { get; set; }
    }

    /// <summary>
    /// Thin HTTP client that pushes extracted drawing JSON to the MyWorkspace
    /// backend at POST /api/drawings/upload. Authentication is Bearer-token
    /// based and fully optional when the API is reached via the web app.
    /// </summary>
    public static class ApiClient
    {
        private static readonly HttpClient Http = new()
        {
            Timeout = TimeSpan.FromSeconds(60),
        };

        public static async Task<UploadResult> UploadDrawingAsync(
            string apiBaseUrl,
            string? apiToken,
            DrawingPayload payload)
        {
            var result = new UploadResult();
            try
            {
                using var request = new HttpRequestMessage(
                    HttpMethod.Post,
                    new Uri(apiBaseUrl.TrimEnd('/') + "/drawings/upload"));

                if (!string.IsNullOrWhiteSpace(apiToken))
                {
                    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiToken.Trim());
                }

                var json = JsonSerializer.Serialize(payload);
                request.Content = new StringContent(json, Encoding.UTF8, "application/json");

                using var response = await Http.SendAsync(request);
                result.StatusCode = (int)response.StatusCode;
                var body = await response.Content.ReadAsStringAsync();
                result.RawResponse = body;

                if (!response.IsSuccessStatusCode)
                {
                    result.Error = string.IsNullOrWhiteSpace(body) ? $"HTTP {result.StatusCode}" : body;
                    return result;
                }

                using var doc = JsonDocument.Parse(body);
                if (doc.RootElement.TryGetProperty("data", out var dataEl))
                {
                    if (dataEl.TryGetProperty("id", out var idEl)) result.DrawingId = idEl.GetString();
                    if (dataEl.TryGetProperty("entityCount", out var cntEl)) result.EntityCount = cntEl.GetInt32();
                }
                result.Success = true;
                return result;
            }
            catch (Exception ex)
            {
                result.Error = ex.Message;
                return result;
            }
        }
    }
}