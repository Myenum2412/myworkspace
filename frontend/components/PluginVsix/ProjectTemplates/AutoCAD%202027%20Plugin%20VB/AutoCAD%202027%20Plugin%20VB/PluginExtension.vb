Imports Autodesk.AutoCAD.Runtime

' This line is not mandatory, but improves loading performances
<Assembly: ExtensionApplication(GetType($safeprojectname$.PluginExtension))>
Namespace $safeprojectname$
    Public Class PluginExtension
        Implements IExtensionApplication

        Public Sub Initialize() Implements IExtensionApplication.Initialize
            ' Add your initialization code here
        End Sub

        Public Sub Terminate() Implements IExtensionApplication.Terminate
            ' Add your termination code here
        End Sub

    End Class
End Namespace
