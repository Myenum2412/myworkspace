# File Management System Tree

```
myworkspace.myenum.in
│
├── Frontend (Vercel)
│   └── /files ................. File Manager page (client-based folder view)
│
├── AWS Server (api.myworkspace.envaxon.co.in)
│   │
│   ├── Nginx (port 80/443)
│   │   └── reverse_proxy → Backend (port 4000)
│   │
│   └── Backend API Routes
│       ├── /api/files ............. CRUD + search files
│       ├── /api/files-tus ........ TUS resumable uploads
│       └── /api/file-approval .... File approval workflow
│
└── Local Filesystem (data/uploads/)
    └── {orgId}/
        ├── {timestamp}-{uuid}-{filename}  (files stored flat)
```

## Database Models

```
MongoDB: myworkspace
│
├── organizations  ............. Tenant/workspace
│   ├── id, name, slug, plan, ownerId
│   └── ...
│
├── clients  ................... Clients within an org
│   ├── id, orgId, name, company, email, status
│   └── ...
│
├── folders  ................... Hierarchical folder tree
│   ├── id, orgId, clientId, parentId, name, path
│   ├── clientId: "abc" ──────── Root folder for a client
│   │   └── parentId: null
│   └── ...
│
├── fileAttachments ............ All uploaded files
│   ├── id, orgId, name, originalName, mimeType, size
│   ├── storagePath: "{orgId}/{timestamp}-{uuid}-{name}"
│   ├── storageProvider: "local"
│   ├── category: "profile" | "report" | "general" | "document" | ...
│   ├── projectId: null | "..."  ── Linked to a project
│   ├── clientId: null | "..."   ── Linked to a client
│   ├── folderId: null | "..."   ── Placed in a folder
│   ├── staffId: null | "..."    ── Linked to a staff member
│   ├── departmentId: null | "..." ── Linked to a department
│   ├── approvalStatus: "none" | "pending" | "approved" | "rejected"
│   ├── currentVersion: 1, 2, ...
│   ├── deletedAt: null | Date   ── Soft delete
│   └── virusScanStatus: "pending" | "clean" | "infected" | "error"
│
├── fileVersions  .............. Version history of files
├── fileShares  ................ Shared file links
├── shareLinks ................. Public share links
│
├── users  ..................... Workspace users
├── tasks  ..................... Tasks (no direct file ref — linked via projectId)
└── projects  .................. Projects (linked via projectId on files)
```

## Folder / File Navigation Tree

```
Org: "MyWorkspace"
│
├── Client: "Acme Corp"
│   │
│   ├── 📁 Root Folder (parentId: null)
│   │   ├── 📁 Contracts
│   │   │   ├── 📄 contract-2024.pdf
│   │   │   └── 📄 NDA-signed.pdf
│   │   │
│   │   ├── 📁 Invoices
│   │   │   ├── 📄 invoice-001.pdf
│   │   │   └── 📄 invoice-002.pdf
│   │   │
│   │   └── 📁 Project: "Website Redesign" ...... (project-based folder)
│   │       │
│   │       ├── 📁 Design Assets
│   │       │   ├── 🖼️ mockup-v1.png
│   │       │   └── 🖼️ logo-final.svg
│   │       │
│   │       ├── 📁 Task Attachments  ............ Files uploaded via task details
│   │       │   ├── 📄 requirements.docx ........ Attached to Task: "Gather requirements"
│   │       │   ├── 🖼️ screenshot-bug.png ....... Attached to Task: "Fix header bug"
│   │       │   └── 📄 api-spec.pdf ............. Attached to Task: "Document API"
│   │       │
│   │       └── 📁 Reports
│   │           └── 📄 weekly-status.pdf
│   │
│   └── 📁 Branding
│       └── 📄 logo.png
│
├── Client: "Globex Inc"
│   ├── 📁 Project: "Mobile App"
│   │   └── 📁 Task Attachments
│   │       └── 📄 user-flow.pdf
│   └── 📁 Legal
│
└── Client: "Initech"
    └── (no folders yet)
```

## How Files Are Stored (Backend Flow)

```
User uploads file
        │
        ▼
Frontend (Vercel)
  POST /api/files/upload
  body: FormData { file, orgId, clientId, folderId?, projectId? }
        │
        ▼ rewrite (next.config.js)
  POST https://api.myworkspace.envaxon.co.in/api/files/upload
        │
        ▼
Nginx → Backend (port 4000)
        │
        ▼
1. Auth check (JWT)
2. Org access verification
3. Storage quota check
4. Virus scan (ClamAV)
5. Compute checksum (dedup)
        │
        └──► Local filesystem
            └── backend/data/uploads/{storagePath}
        │
        ▼
6. Create FileAttachment record in MongoDB
7. Emit Socket.IO event: "file:created"
8. Invalidate cache
9. Return file metadata
```

## File Categories

| Category    | Used For                                    |
|-------------|---------------------------------------------|
| general     | Default — any file                          |
| profile     | Employee profile documents (resumes, etc.)  |
| report      | Generated report exports                    |
| document    | Business documents                          |
| image       | Images and graphics                         |
| video       | Video files                                 |
| audio       | Audio recordings                            |
| archive     | ZIP, tar, etc.                              |
