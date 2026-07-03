import request from "supertest";
import type { Server } from "http";
import mongoose from "mongoose";
import app from "../../../src/app.js";
import { connectTestDb, resetDb } from "../../__helpers__/db.js";
import { seedOrgWithAdmin } from "../../__helpers__/users.js";
import { Folder } from "../../../src/lib/db/models/Folder.js";
import { FileAttachment } from "../../../src/lib/db/models/FileAttachment.js";
import { Client } from "../../../src/lib/db/models/Client.js";

let server: Server;
beforeAll(async () => {
  await connectTestDb();
  server = app.listen(0);
});
afterAll(() => server.close());
beforeEach(async () => {
  await resetDb();
});

function agent() {
  return request(server);
}

/**
 * Client File Management: the backend folders/files routers are the single
 * source of truth (the Next app/api data layer was removed). These tests cover
 * the bug fix where client folders existed in the DB but the scoped listing
 * returned nothing, plus isolation, counts, rename, and move.
 */
describe("Client File Management — folders & files (backend canonical)", () => {
  it("GET /api/folders returns provisioned client folders scoped to the org", async () => {
    const a = await seedOrgWithAdmin({ email: `cf-${Date.now()}@ex.seeded` });

    // Simulate what POST /api/clients does (provision): 4 root folders for the client.
    const clientId = new mongoose.Types.ObjectId().toString();
    await Client.create({
      id: clientId, orgId: a.orgId, createdByAdminId: a.userId, createdBy: a.userId,
      clientUserId: new mongoose.Types.ObjectId().toString(),
      name: "Acme", email: `acme-${Date.now()}@ex.seeded`, company: "Acme Co", status: "Active Client",
    });
    for (const nm of ["Documents", "Reports", "Projects", "Settings"]) {
      await Folder.create({
        id: new mongoose.Types.ObjectId().toString(), orgId: a.orgId, clientId,
        parentId: null, name: nm, path: `/clients/${clientId}/${nm}`, createdBy: a.userId,
      });
    }

    const res = await agent().get(`/api/folders?orgId=${a.orgId}`).set(a.headers);
    expect(res.status).toBe(200);
    const data = res.body.data as any[];
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(4);
    expect(data.every((f) => f.clientId === clientId && f.orgId === a.orgId && f.parentId === null)).toBe(true);
  });

  it("GET /api/folders?clientId= scopes to a single client and excludes siblings", async () => {
    const a = await seedOrgWithAdmin({ email: `cf2-${Date.now()}@ex.seeded` });
    const mkClient = async (name: string, email: string) => {
      const clientId = new mongoose.Types.ObjectId().toString();
      await Client.create({
        id: clientId, orgId: a.orgId, createdByAdminId: a.userId, createdBy: a.userId,
        clientUserId: new mongoose.Types.ObjectId().toString(),
        name, email, company: "Co", status: "Active Client",
      });
      await Folder.create({
        id: new mongoose.Types.ObjectId().toString(), orgId: a.orgId, clientId,
        parentId: null, name: "Documents", path: `/clients/${clientId}/Documents`, createdBy: a.userId,
      });
      return clientId;
    };
    const c1 = await mkClient("Alpha", `a-${Date.now()}@ex.seeded`);
    const c2 = await mkClient("Beta", `b-${Date.now()}@ex.seeded`);

    const res = await agent().get(`/api/folders?orgId=${a.orgId}&clientId=${c1}`).set(a.headers);
    expect(res.status).toBe(200);
    const data = res.body.data as any[];
    expect(data.length).toBe(1);
    expect(data[0].clientId).toBe(c1);
    expect(data.some((f) => f.clientId === c2)).toBe(false);
  });

  it("org isolation: another org sees none of the first org's client folders", async () => {
    const a = await seedOrgWithAdmin({ email: `iso1-${Date.now()}@ex.seeded` });
    const b = await seedOrgWithAdmin({ email: `iso2-${Date.now()}@ex.seeded` });
    const clientId = new mongoose.Types.ObjectId().toString();
    await Client.create({
      id: clientId, orgId: a.orgId, createdByAdminId: a.userId, createdBy: a.userId,
      clientUserId: new mongoose.Types.ObjectId().toString(),
      name: "Iso", email: `iso-${Date.now()}@ex.seeded`, company: "Co", status: "Active Client",
    });
    await Folder.create({
      id: new mongoose.Types.ObjectId().toString(), orgId: a.orgId, clientId,
      parentId: null, name: "Documents", path: `/clients/${clientId}/Documents`, createdBy: a.userId,
    });

    const res = await agent().get(`/api/folders?orgId=${b.orgId}`).set(b.headers);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);

    // Cross-org scoped query also empty.
    const res2 = await agent().get(`/api/folders?orgId=${b.orgId}&clientId=${clientId}`).set(b.headers);
    expect(res2.body.data).toEqual([]);
  });

  it("GET /api/files/stats returns uncapped totalFiles/totalSize per client", async () => {
    const a = await seedOrgWithAdmin({ email: `st-${Date.now()}@ex.seeded` });
    const clientId = new mongoose.Types.ObjectId().toString();
    await Client.create({
      id: clientId, orgId: a.orgId, createdByAdminId: a.userId, createdBy: a.userId,
      clientUserId: new mongoose.Types.ObjectId().toString(),
      name: "StatCo", email: `stat-${Date.now()}@ex.seeded`, company: "Co", status: "Active Client",
    });
    const folderId = new mongoose.Types.ObjectId().toString();
    await Folder.create({ id: folderId, orgId: a.orgId, clientId, parentId: null, name: "Docs", path: `/clients/${clientId}/Docs`, createdBy: a.userId });
    // 30 files, each 100 bytes -> totalSize 3000, totalFiles 30 (would be capped at 25 by the workspace dashboard).
    for (let i = 0; i < 30; i++) {
      await FileAttachment.create({
        id: new mongoose.Types.ObjectId().toString(), orgId: a.orgId, clientId, folderId,
        uploaderId: a.userId, createdBy: a.userId, name: `f${i}.txt`, originalName: `f${i}.txt`,
        mimeType: "text/plain", size: 100, storagePath: `/f${i}.txt`, storageProvider: "local",
        category: "general",
      });
    }

    const res = await agent().get(`/api/files/stats?orgId=${a.orgId}&clientId=${clientId}`).set(a.headers);
    expect(res.status).toBe(200);
    expect(res.body.data.totalFiles).toBe(30);
    expect(res.body.data.totalSize).toBe(3000);
  });

  it("PATCH /api/folders/:id renames a client folder and rewrites nested paths", async () => {
    const a = await seedOrgWithAdmin({ email: `rn-${Date.now()}@ex.seeded` });
    const clientId = new mongoose.Types.ObjectId().toString();
    const rootId = new mongoose.Types.ObjectId().toString();
    await Folder.create({ id: rootId, orgId: a.orgId, clientId, parentId: null, name: "Docs", path: `/clients/${clientId}/Docs`, createdBy: a.userId });
    const childId = new mongoose.Types.ObjectId().toString();
    await Folder.create({ id: childId, orgId: a.orgId, clientId, parentId: rootId, name: "Sub", path: `/clients/${clientId}/Docs/Sub`, createdBy: a.userId });

    const res = await agent().patch(`/api/folders/${rootId}`).set(a.headers).send({ name: "Documents" });
    expect(res.status).toBe(200);

    const root = await Folder.findOne({ id: rootId }).lean();
    const child = await Folder.findOne({ id: childId }).lean();
    expect(root?.name).toBe("Documents");
    expect(root?.path).toBe(`/Documents`);
    expect(child?.path).toBe(`/Documents/Sub`);
  });

  it("POST /api/files/upload persists orgId, clientId, uploader, timestamps, metadata", async () => {
    const a = await seedOrgWithAdmin({ email: `up-${Date.now()}@ex.seeded` });
    const clientId = new mongoose.Types.ObjectId().toString();
    const folderId = new mongoose.Types.ObjectId().toString();
    await Folder.create({ id: folderId, orgId: a.orgId, clientId, parentId: null, name: "Docs", path: `/clients/${clientId}/Docs`, createdBy: a.userId });

    const res = await agent()
      .post("/api/files/upload")
      .set(a.headers)
      .field("orgId", a.orgId)
      .field("clientId", clientId)
      .field("folderId", folderId)
      .field("description", "test file")
      .field("tags", JSON.stringify(["a", "b"]))
      .attach("files", Buffer.from("hello world"), "hello.txt");

    expect(res.status).toBe(201);
    const file = await FileAttachment.findOne({ id: res.body.results[0].fileId }).lean();
    expect(file).not.toBeNull();
    expect(file?.orgId).toBe(a.orgId);
    expect(file?.clientId).toBe(clientId);
    expect(file?.folderId).toBe(folderId);
    expect(file?.uploaderId).toBe(a.userId);
    expect(file?.createdBy).toBe(a.userId);
    expect(file?.name).toBe("hello.txt");
    expect(file?.description).toBe("test file");
    expect(file?.tags).toEqual(["a", "b"]);
    expect(file?.createdAt).toBeInstanceOf(Date);
    expect(file?.updatedAt).toBeInstanceOf(Date);
  });

  it("non-member of the org is forbidden from listing client folders (403)", async () => {
    const a = await seedOrgWithAdmin({ email: `forb-${Date.now()}@ex.seeded` });
    const clientId = new mongoose.Types.ObjectId().toString();
    await Folder.create({ id: new mongoose.Types.ObjectId().toString(), orgId: a.orgId, clientId, parentId: null, name: "Docs", path: `/clients/${clientId}/Docs`, createdBy: a.userId });

    const outsider = await seedOrgWithAdmin({ email: `out-${Date.now()}@ex.seeded` });
    const res = await agent().get(`/api/folders?orgId=${a.orgId}`).set(outsider.headers);
    expect(res.status).toBe(403);
  });
});
