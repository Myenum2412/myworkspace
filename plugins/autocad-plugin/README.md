# MyWorkspace AutoCAD Plugin (plugins/autocad-plugin)

A lightweight AutoCAD .NET (C#) plugin that extracts entities from the active DWG
and pushes structured JSON to the MyWorkspace backend for storage, visualization,
and collaboration.

Scaffolded from the official **AutoCAD 2027 .NET project template** shipped in
`frontend/components/PluginVsix` (targets `.NET 10.0-windows`, `x64`, AutoCAD.NET
NuGet v26.0.0).

## Commands

| Command     | Description                                                        |
| ----------- | ------------------------------------------------------------------ |
| `MW_EXPORT` | Scans Model/Paper space, prints entity summary to the command line |
| `MW_UPLOAD` | Extracts entities, serializes to JSON, POSTs to `/api/drawings/upload` |
| `MWCONFIG`  | Sets API base URL, bearer token, user ID, auto-upload toggle (persisted in `%APPDATA%\MyWorkspace\autocad-plugin.json`) |

When auto-upload is enabled, `MW_EXPORT` also uploads after printing the summary.

## Supported entities

* `Line` (start + end coordinates)
* `Polyline` / `Polyline2d` / `Polyline3d` (all vertices, flattened `[x,y,z,...]`)
* `Circle` (center + radius)

Every entity includes `type`, `layer`, `handle`, and `coordinates`; other
entities are counted under "Other" but not serialized (keeps the plugin light).

## Build & load

1. Open `MyWorkspacePlugin.sln` in **Visual Studio 2026** (18.0) + `.NET 10.0` on Windows.
2. Build the `x64` configuration -> produces `bin\x64\Debug\MyWorkspacePlugin.dll`.
3. In AutoCAD 2027 run `NETLOAD` and select the DLL.
4. Run `MWCONFIG` once to point at your backend, e.g. `http://localhost:4000/api` (dev) or `https://app.myworkspace.com/api` (prod), then paste an API token (a Bearer JWT / session token) if required and set the user ID.
5. Run `MW_EXPORT` and/or `MW_UPLOAD`.

## Backend contract

`POST /api/drawings/upload` (authenticated; accepts cookies or `Authorization: Bearer <token>`)

```json
{
  "drawingName": "floor-plan",
  "userId": "optional",
  "sourceFile": "C:\\...\\floor-plan.dwg",
  "summary": {
    "totalEntities": 36,
    "lines": 25,
    "polylines": 10,
    "circles": 1,
    "otherEntities": 0,
    "layers": ["0", "Walls"]
  },
  "entities": [
    {
      "type": "Line",
      "layer": "0",
      "handle": "1B2",
      "coordinates": [0, 0, 0, 100, 0, 0],
      "radius": 0
    }
  ],
  "metadata": { "pluginVersion": "1.0.0", "autocadVersion": "2027.1.1" }
}
```

Response: `201 { "success": true, "data": { "id", "drawingName", "entityCount", "summary", "createdAt" } }`

Other endpoints: `GET /api/drawings` (list), `GET /api/drawings/:id`, `DELETE /api/drawings/:id`.

## Design notes

* Extraction runs inside a single database transaction; unsupported/erased/errored entities are skipped, never fatal.
* All heavy lifting is on the backend; the plugin only reads and ships geometry.
* Configuration (API URL, token, user ID) persists under `%APPDATA%\MyWorkspace\`.
* Entity coordinates are rounded to 3 decimal places to keep payloads small.
* Entity uploads are capped at `MaxEntities` (default 100 000). The cap is not exposed via `MWCONFIG`; to change it, edit the default in `src/Config/PluginConfig.cs`.

## Future scope

* Real-time sync / auto-upload on save (in-canvas command reactor)
* Layer-based filtering, entity preview in Three.js / Autodesk Forge Viewer
* Native user login inside AutoCAD (refresh token flow)
* File versioning and drawing annotations
