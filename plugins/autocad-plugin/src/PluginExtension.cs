using Autodesk.AutoCAD.Runtime;

namespace MyWorkspacePlugin
{
    /// <summary>
    /// Entry point invoked by AutoCAD when the assembly is NETLOADed.
    /// Configuration is loaded lazily per command, so no warm-up work is needed.
    /// </summary>
    public class PluginExtension : IExtensionApplication
    {
        public void Initialize()
        {
        }

        public void Terminate()
        {
        }
    }
}