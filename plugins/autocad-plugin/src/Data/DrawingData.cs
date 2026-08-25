using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace MyWorkspacePlugin.Data
{
    public class EntityData
    {
        [JsonPropertyName("type")]
        public string Type { get; set; } = "";

        [JsonPropertyName("layer")]
        public string Layer { get; set; } = "";

        [JsonPropertyName("handle")]
        public string Handle { get; set; } = "";

        [JsonPropertyName("coordinates")]
        public List<double> Coordinates { get; set; } = new();

        [JsonPropertyName("radius")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
        public double Radius { get; set; }
    }

    public class DrawingSummary
    {
        [JsonPropertyName("totalEntities")]
        public int TotalEntities { get; set; }

        [JsonPropertyName("lines")]
        public int Lines { get; set; }

        [JsonPropertyName("polylines")]
        public int Polylines { get; set; }

        [JsonPropertyName("circles")]
        public int Circles { get; set; }

        [JsonPropertyName("otherEntities")]
        public int OtherEntities { get; set; }

        [JsonPropertyName("layers")]
        public List<string> Layers { get; set; } = new();
    }

    public class DrawingMetadata
    {
        [JsonPropertyName("pluginVersion")]
        public string PluginVersion { get; set; } = "1.0.0";

        [JsonPropertyName("autocadVersion")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? AutocadVersion { get; set; }
    }

    public class DrawingPayload
    {
        [JsonPropertyName("drawingName")]
        public string DrawingName { get; set; } = "";

        [JsonPropertyName("userId")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? UserId { get; set; }

        [JsonPropertyName("sourceFile")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? SourceFile { get; set; }

        [JsonPropertyName("summary")]
        public DrawingSummary Summary { get; set; } = new();

        [JsonPropertyName("entities")]
        public List<EntityData> Entities { get; set; } = new();

        [JsonPropertyName("metadata")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public DrawingMetadata? Metadata { get; set; }
    }
}