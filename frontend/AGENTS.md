<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:file-categories -->
# File Categories

Files stored in the `fileAttachments` (`file_attachments`) collection have a `category` field with one of three values:
- `"general"` (default) — generic file uploads
- `"profile"` — employee/user profile documents (resumes, offer letters, etc.)
- `"report"` — report exports or generated report files

When uploading a file, include `category` in the request body to tag it appropriately:
- Employee document uploads in add-employee-form use `"profile"`
- General upload page uses no category (defaults to `"general"`)

The File Manager at `/orgmenu/files` shows category tabs (All / Profile / Report / General) that filter files by category.
<!-- END:file-categories -->
