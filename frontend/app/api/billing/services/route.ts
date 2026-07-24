import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";

export async function GET() {
  try {
    const services = await db.collection(collections.services).find({}).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ data: services });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const service = {
      id: uuid(),
      name: body.name,
      description: body.description || "",
      category: body.category || "",
      rate: body.rate || 0,
      unit: body.unit || "Project",
      status: body.status || "Active",
      created: new Date().toISOString(),
      createdAt: new Date(),
    };
    await db.collection(collections.services).insertOne(service);
    return NextResponse.json({ data: service }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create service" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { ids } = await request.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No service IDs provided" }, { status: 400 });
    }
    await db.collection(collections.services).deleteMany({ id: { $in: ids } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete services" }, { status: 500 });
  }
}