using System;
using System.Collections.Generic;
using System.Linq;
using Autodesk.AutoCAD.DatabaseServices;
using MyWorkspacePlugin.Data;

namespace MyWorkspacePlugin.Extraction
{
    public class ExtractionResult
    {
        public List<EntityData> Entities { get; } = new();
        public DrawingSummary Summary { get; } = new();
        public int SkippedEntities { get; internal set; }
    }

    /// <summary>
    /// Reads supported entities (Line, Polyline, Polyline2d, Polyline3d, Circle)
    /// from the Model and Paper space block records of the active drawing.
    /// </summary>
    public static class DrawingExtractor
    {
        private const int RoundingDigits = 3;

        public static ExtractionResult Extract(Database db, int maxEntities)
        {
            var result = new ExtractionResult();
            var layers = new HashSet<string>();
            var seen = 0;

            using (var tr = db.TransactionManager.StartTransaction())
            {
                var bt = (BlockTable)tr.GetObject(db.BlockTableId, OpenMode.ForRead);

                var spaces = new[]
                {
                    bt[BlockTableRecord.ModelSpace],
                    bt[BlockTableRecord.PaperSpace],
                };

                foreach (var spaceId in spaces)
                {
                    if (seen >= maxEntities) break;
                    var btr = (BlockTableRecord)tr.GetObject(spaceId, OpenMode.ForRead);

                    foreach (ObjectId id in btr)
                    {
                        if (seen >= maxEntities) break;
                        if (!id.IsValid || id.IsErased || id.IsNull) continue;

                        DBObject? obj = null;
                        try
                        {
                            obj = tr.GetObject(id, OpenMode.ForRead, false, true);
                        }
                        catch (Autodesk.AutoCAD.Runtime.Exception)
                        {
                            result.SkippedEntities++;
                            continue;
                        }

                        if (obj is not Entity ent) continue;
                        seen++;

                        try
                        {
                            if (ExtractEntity(ent, tr, result)) layers.Add(ent.Layer);
                        }
                        catch (Autodesk.AutoCAD.Runtime.Exception)
                        {
                            result.SkippedEntities++;
                        }
                    }
                }

                tr.Commit();
            }

            result.Summary.TotalEntities = seen;
            result.Summary.Layers = layers.OrderBy(l => l, StringComparer.OrdinalIgnoreCase).ToList();
            return result;
        }

        private static bool ExtractEntity(Entity ent, Transaction tr, ExtractionResult result)
        {
            switch (ent)
            {
                case Line line:
                {
                    var coords = new List<double>(6)
                    {
                        Round(line.StartPoint.X),
                        Round(line.StartPoint.Y),
                        Round(line.StartPoint.Z),
                        Round(line.EndPoint.X),
                        Round(line.EndPoint.Y),
                        Round(line.EndPoint.Z),
                    };
                    result.Entities.Add(new EntityData
                    {
                        Type = "Line",
                        Layer = line.Layer,
                        Handle = line.Handle.ToString(),
                        Coordinates = coords,
                    });
                    result.Summary.Lines++;
                    return true;
                }

                case Polyline pline:
                {
                    var coords = new List<double>(pline.VertexCount * 3);
                    for (int i = 0; i < pline.VertexCount; i++)
                    {
                        var pt = pline.GetPoint3dAt(i);
                        coords.Add(Round(pt.X));
                        coords.Add(Round(pt.Y));
                        coords.Add(Round(pt.Z));
                    }
                    result.Entities.Add(new EntityData
                    {
                        Type = "Polyline",
                        Layer = pline.Layer,
                        Handle = pline.Handle.ToString(),
                        Coordinates = coords,
                    });
                    result.Summary.Polylines++;
                    return true;
                }

                case Polyline3d pline3d:
                {
                    var coords = new List<double>(pline3d.VertexCount * 3);
                    for (int i = 0; i < pline3d.VertexCount; i++)
                    {
                        var pt = pline3d.GetPoint3dAt(i);
                        coords.Add(Round(pt.X));
                        coords.Add(Round(pt.Y));
                        coords.Add(Round(pt.Z));
                    }
                    result.Entities.Add(new EntityData
                    {
                        Type = "Polyline3d",
                        Layer = pline3d.Layer,
                        Handle = pline3d.Handle.ToString(),
                        Coordinates = coords,
                    });
                    result.Summary.Polylines++;
                    return true;
                }

                case Polyline2d pline2d:
                {
                    var coords = new List<double>();
                    if (pline2d.VertexIds != null)
                    {
                        foreach (ObjectId vid in pline2d.VertexIds)
                        {
                            if (tr.GetObject(vid, OpenMode.ForRead, false, true) is not Vertex2d v2d)
                                continue;
                            var pt = v2d.Position;
                            coords.Add(Round(pt.X));
                            coords.Add(Round(pt.Y));
                            coords.Add(Round(pt.Z));
                        }
                    }
                    result.Entities.Add(new EntityData
                    {
                        Type = "Polyline2d",
                        Layer = pline2d.Layer,
                        Handle = pline2d.Handle.ToString(),
                        Coordinates = coords,
                    });
                    result.Summary.Polylines++;
                    return true;
                }

                case Circle circle:
                {
                    var coords = new List<double>(3)
                    {
                        Round(circle.Center.X),
                        Round(circle.Center.Y),
                        Round(circle.Center.Z),
                    };
                    result.Entities.Add(new EntityData
                    {
                        Type = "Circle",
                        Layer = circle.Layer,
                        Handle = circle.Handle.ToString(),
                        Coordinates = coords,
                        Radius = Round(circle.Radius),
                    });
                    result.Summary.Circles++;
                    return true;
                }

                default:
                    result.Summary.OtherEntities++;
                    return false;
            }
        }

        private static double Round(double value) => Math.Round(value, RoundingDigits);
    }
}