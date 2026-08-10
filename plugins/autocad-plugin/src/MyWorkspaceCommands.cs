using System;
using System.IO;
using Autodesk.AutoCAD.ApplicationServices;
using Autodesk.AutoCAD.EditorInput;
using Autodesk.AutoCAD.Runtime;
using MyWorkspacePlugin.Api;
using MyWorkspacePlugin.Config;
using MyWorkspacePlugin.Data;
using MyWorkspacePlugin.Extraction;
using AcadApp = Autodesk.AutoCAD.ApplicationServices.Application;

[assembly: CommandClass(typeof(MyWorkspacePlugin.MyWorkspaceCommands))]
[assembly: ExtensionApplication(typeof(MyWorkspacePlugin.PluginExtension))]

namespace MyWorkspacePlugin
{
    public class MyWorkspaceCommands
    {
        private const string PluginVersion = "1.0.0";

        [CommandMethod("MyWorkspace", "MW_EXPORT", "MWEXPORT", CommandFlags.Modal)]
        public void ExportSummary()
        {
            try
            {
                var doc = AcadApp.DocumentManager.MdiActiveDocument;
                if (doc == null)
                {
                    WriteError("No active document to export.");
                    return;
                }

                var config = PluginConfig.Load();
                var result = DrawingExtractor.Extract(doc.Database, config.MaxEntities);
                WriteSummary(doc.Editor, result);

                if (config.AutoUploadAfterExport)
                {
                    UploadCore(doc, config, result);
                }
            }
            catch (System.Exception ex)
            {
                WriteError(ex.Message);
            }
        }

        [CommandMethod("MyWorkspace", "MW_UPLOAD", "MWUPLOAD", CommandFlags.Modal)]
        public void UploadDrawing()
        {
            try
            {
                var doc = AcadApp.DocumentManager.MdiActiveDocument;
                if (doc == null)
                {
                    WriteError("No active document to upload.");
                    return;
                }

                var config = PluginConfig.Load();
                if (string.IsNullOrWhiteSpace(config.ApiBaseUrl))
                {
                    doc.Editor.WriteMessage("\n[MW] API base URL is not configured. Run MWCONFIG first.");
                    return;
                }

                var result = DrawingExtractor.Extract(doc.Database, config.MaxEntities);
                WriteSummary(doc.Editor, result);
                UploadCore(doc, config, result);
            }
            catch (System.Exception ex)
            {
                WriteError(ex.Message);
            }
        }

        [CommandMethod("MyWorkspace", "MWCONFIG", "MWCONFIG", CommandFlags.Modal)]
        public void Configure()
        {
            try
            {
                var doc = AcadApp.DocumentManager.MdiActiveDocument;
                var ed = doc?.Editor;
                if (ed == null)
                {
                    WriteError("No active document.");
                    return;
                }

                var config = PluginConfig.Load();

                var urlPrompt = new PromptStringOptions($"\n[MW] API base URL (blank to keep) <{config.ApiBaseUrl}>:")
                {
                    AllowSpaces = true,
                };
                var urlResult = ed.GetString(urlPrompt);
                if (urlResult.Status == PromptStatus.OK && !string.IsNullOrWhiteSpace(urlResult.StringResult))
                {
                    config.ApiBaseUrl = urlResult.StringResult.Trim();
                }

                var tokenPrompt = new PromptStringOptions("\n[MW] API bearer token (blank to keep):")
                {
                    AllowSpaces = true,
                    MaxLength = 16384,
                };
                var tokenResult = ed.GetString(tokenPrompt);
                if (tokenResult.Status == PromptStatus.OK && !string.IsNullOrWhiteSpace(tokenResult.StringResult))
                {
                    config.ApiToken = tokenResult.StringResult.Trim();
                }

                var userPrompt = new PromptStringOptions(
                    $"\n[MW] User ID (blank to keep) <{config.UserId ?? "(not set)"}>:")
                {
                    AllowSpaces = false,
                };
                var userResult = ed.GetString(userPrompt);
                if (userResult.Status == PromptStatus.OK && !string.IsNullOrWhiteSpace(userResult.StringResult))
                {
                    config.UserId = userResult.StringResult.Trim();
                }

                var autoPrompt = new PromptKeywordOptions(
                    $"\n[MW] Auto-upload after MW_EXPORT? <{(config.AutoUploadAfterExport ? "Yes" : "No")}>:",
                    new[] { "Yes", "No" });
                var autoResult = ed.GetKeywords(autoPrompt);
                if (autoResult.Status == PromptStatus.OK)
                {
                    config.AutoUploadAfterExport = autoResult.StringResult.Equals("Yes", StringComparison.OrdinalIgnoreCase);
                }

                config.Save();
                ed.WriteMessage("\n[MW] Configuration saved to {0}", PluginConfig.ConfigFilePath);
                ed.WriteMessage("\n[MW]   API base URL        : {0}", config.ApiBaseUrl);
                ed.WriteMessage("\n[MW]   Bearer token        : {0}", config.ApiToken == null ? "(not set)" : "(set)");
                ed.WriteMessage("\n[MW]   User ID             : {0}", config.UserId ?? "(not set)");
                ed.WriteMessage("\n[MW]   Auto-upload on export: {0}", config.AutoUploadAfterExport ? "Yes" : "No");
            }
            catch (System.Exception ex)
            {
                WriteError(ex.Message);
            }
        }

        private static void UploadCore(Document doc, PluginConfig config, ExtractionResult result)
        {
            if (result.Entities.Count == 0)
            {
                doc.Editor.WriteMessage("\n[MW] No supported entities to upload.");
                return;
            }

            var payload = BuildPayload(doc, result, config);
            var jsonSizeKb = System.Text.Encoding.UTF8.GetByteCount(System.Text.Json.JsonSerializer.Serialize(payload)) / 1024;

            doc.Editor.WriteMessage(
                "\n[MW] Uploading {0} entities ({1} KB) to {2} ...",
                result.Entities.Count,
                jsonSizeKb,
                config.ApiBaseUrl);

            var upload = ApiClient.UploadDrawingAsync(config.ApiBaseUrl, config.ApiToken, payload).GetAwaiter().GetResult();

            if (upload.Success)
            {
                doc.Editor.WriteMessage(
                    "\n[MW] Upload success. Drawing ID: {0} ({1} entities stored).",
                    upload.DrawingId ?? "(unknown)",
                    upload.EntityCount);
            }
            else
            {
                doc.Editor.WriteMessage(
                    "\n[MW] Upload failed (HTTP {0}): {1}",
                    upload.StatusCode,
                    upload.Error ?? "Unknown error");
            }
        }

        private static DrawingPayload BuildPayload(Document doc, ExtractionResult result, PluginConfig config)
        {
            string drawingName = "Untitled";
            try
            {
                if (!string.IsNullOrWhiteSpace(doc.Name))
                {
                    drawingName = Path.GetFileNameWithoutExtension(doc.Name);
                }
            }
            catch
            {
                // Fall back to the default name
            }

            return new DrawingPayload
            {
                DrawingName = drawingName,
                UserId = string.IsNullOrWhiteSpace(config.UserId) ? null : config.UserId.Trim(),
                SourceFile = doc.Name,
                Summary = result.Summary,
                Entities = result.Entities,
                Metadata = new DrawingMetadata
                {
                    PluginVersion = PluginVersion,
                    AutocadVersion = AcadApp.Version?.ToString(),
                },
            };
        }

        private static void WriteSummary(Editor ed, ExtractionResult result)
        {
            var s = result.Summary;
            ed.WriteMessage("\n[MW] MyWorkspace export summary:");
            ed.WriteMessage("\n[MW]   Total entities : {0}", s.TotalEntities);
            ed.WriteMessage("\n[MW]   Lines          : {0}", s.Lines);
            ed.WriteMessage("\n[MW]   Polylines      : {0}", s.Polylines);
            ed.WriteMessage("\n[MW]   Circles        : {0}", s.Circles);
            if (s.OtherEntities > 0)
            {
                ed.WriteMessage("\n[MW]   Other          : {0}", s.OtherEntities);
            }
            if (result.SkippedEntities > 0)
            {
                ed.WriteMessage("\n[MW]   Skipped        : {0}", result.SkippedEntities);
            }
            ed.WriteMessage("\n[MW]   Layers         : {0}", string.Join(", ", s.Layers));
        }

        private static void WriteError(string message)
        {
            var doc = AcadApp.DocumentManager.MdiActiveDocument;
            doc?.Editor.WriteMessage("\n[MW] ERROR: {0}", message);
        }
    }
}