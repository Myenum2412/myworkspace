using System;
using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace MyWorkspacePlugin.Config
{
    public class PluginConfig
    {
        public string ApiBaseUrl { get; set; } = "https://app.myworkspace.com/api";

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? ApiToken { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? UserId { get; set; }

        public bool AutoUploadAfterExport { get; set; }

        public int MaxEntities { get; set; } = 100_000;

        private static readonly object SyncLock = new();
        private static readonly string ConfigDirectory =
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "MyWorkspace");
        private static readonly string ConfigPath =
            Path.Combine(ConfigDirectory, "autocad-plugin.json");

        public static PluginConfig Load()
        {
            lock (SyncLock)
            {
                try
                {
                    if (File.Exists(ConfigPath))
                    {
                        var json = File.ReadAllText(ConfigPath);
                        var config = JsonSerializer.Deserialize<PluginConfig>(json);
                        if (config != null) return config;
                    }
                }
                catch
                {
                    // Fall back to defaults on any config error
                }
                return new PluginConfig();
            }
        }

        public void Save()
        {
            lock (SyncLock)
            {
                try
                {
                    Directory.CreateDirectory(ConfigDirectory);
                    var json = JsonSerializer.Serialize(this, new JsonSerializerOptions { WriteIndented = true });
                    File.WriteAllText(ConfigPath, json);
                }
                catch
                {
                    // Best effort: a failed save must never break a command
                }
            }
        }

        public static string ConfigFilePath => ConfigPath;
    }
}