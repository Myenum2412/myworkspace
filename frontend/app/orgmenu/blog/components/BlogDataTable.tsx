"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoreHorizontal, Pencil, Trash2, Eye, Globe, Archive, RotateCcw } from "lucide-react";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "scheduled" | "published" | "archived";
  authorName: string;
  categories: string[];
  views: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface BlogDataTableProps {
  initialPosts: BlogPost[];
  categories: { name: string }[];
  orgId: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  scheduled: "bg-blue-100 text-blue-800",
  published: "bg-green-100 text-green-800",
  archived: "bg-red-100 text-red-800",
};

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function BlogDataTable({ initialPosts, categories, orgId }: BlogDataTableProps) {
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loading, setLoading] = useState<string | null>(null);

  const filteredPosts = posts.filter(post => {
    if (search && !post.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && post.status !== statusFilter) return false;
    if (categoryFilter !== "all" && !post.categories.includes(categoryFilter)) return false;
    return true;
  });

  const handleAction = useCallback(async (action: string, postId: string) => {
    setLoading(postId);
    try {
      const baseUrl = "/api/blog/admin";
      let method = "POST";
      let body: any = {};

      switch (action) {
        case "publish":
          body = { action: "publish" };
          break;
        case "unpublish":
          body = { action: "unpublish" };
          break;
        case "archive":
          method = "DELETE";
          break;
        case "restore":
          body = { action: "restore" };
          break;
        case "delete":
          body = { action: "permanent-delete" };
          break;
      }

      if (action === "publish" || action === "unpublish" || action === "restore") {
        await fetch(`${baseUrl}/${postId}/${action}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
      } else if (action === "archive") {
        await fetch(`${baseUrl}/${postId}`, { method: "DELETE" });
      } else if (action === "delete") {
        await fetch(`${baseUrl}/${postId}/permanent-delete`, { method: "POST" });
      }

      // Refresh the list
      const res = await fetch(`/api/blog/admin?orgId=${orgId}&limit=100`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.data || []);
      }
    } catch (err) {
      console.error("Action failed:", err);
    } finally {
      setLoading(null);
    }
  }, [orgId]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search posts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:w-64 bg-white"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.name} value={cat.name}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Views</TableHead>
              <TableHead>Published</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPosts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No posts found
                </TableCell>
              </TableRow>
            ) : (
              filteredPosts.map(post => (
                <TableRow key={post.id}>
                  <TableCell className="font-medium max-w-[300px] truncate">
                    {post.title}
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[post.status]}>
                      {post.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{post.authorName}</TableCell>
                  <TableCell>
                    {post.categories.length > 0 ? post.categories[0] : "-"}
                  </TableCell>
                  <TableCell className="text-right">{post.views.toLocaleString()}</TableCell>
                  <TableCell>
                    {post.publishedAt ? formatDate(post.publishedAt) : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" disabled={loading === post.id}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/orgmenu/blog/editor/${post.id}`}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/blog/${post.slug}`} target="_blank">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {post.status !== "published" && (
                          <DropdownMenuItem onClick={() => handleAction("publish", post.id)}>
                            <Globe className="h-4 w-4 mr-2" />
                            Publish
                          </DropdownMenuItem>
                        )}
                        {post.status === "published" && (
                          <DropdownMenuItem onClick={() => handleAction("unpublish", post.id)}>
                            <Archive className="h-4 w-4 mr-2" />
                            Unpublish
                          </DropdownMenuItem>
                        )}
                        {post.status !== "archived" && (
                          <DropdownMenuItem onClick={() => handleAction("archive", post.id)}>
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                        )}
                        {post.status === "archived" && (
                          <DropdownMenuItem onClick={() => handleAction("restore", post.id)}>
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Restore
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleAction("delete", post.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground">
        Showing {filteredPosts.length} of {posts.length} posts
      </p>
    </div>
  );
}
