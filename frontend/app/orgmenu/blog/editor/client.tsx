"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Eye, Send, ArrowLeft, X, Plus } from "lucide-react";
import { TiptapEditor } from "@/components/ui/tiptap-editor";

interface InitialPost {
  id: string;
  title: string;
  subtitle?: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  categories: string[];
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  canonicalUrl?: string;
  featured: boolean;
  status: string;
}

interface BlogEditorClientProps {
  orgId: string;
  userId: string;
  userName: string;
  initialPost?: InitialPost;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 200);
}

function calculateReadingTime(content: string): number {
  const text = content.replace(/<[^>]*>/g, "").replace(/[#*`>\-\[\]()]/g, "");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function BlogEditorClient({
  orgId,
  userId,
  userName,
  initialPost,
}: BlogEditorClientProps) {
  const router = useRouter();
  const isEditing = !!initialPost;

  const [title, setTitle] = useState(initialPost?.title || "");
  const [subtitle, setSubtitle] = useState(initialPost?.subtitle || "");
  const [content, setContent] = useState(initialPost?.content || "");
  const [excerpt, setExcerpt] = useState(initialPost?.excerpt || "");
  const [featuredImage, setFeaturedImage] = useState(initialPost?.featuredImage || "");
  const [categories, setCategories] = useState<string[]>(initialPost?.categories || []);
  const [tags, setTags] = useState<string[]>(initialPost?.tags || []);
  const [seoTitle, setSeoTitle] = useState(initialPost?.seoTitle || "");
  const [seoDescription, setSeoDescription] = useState(initialPost?.seoDescription || "");
  const [seoKeywords, setSeoKeywords] = useState<string[]>(initialPost?.seoKeywords || []);
  const [canonicalUrl, setCanonicalUrl] = useState(initialPost?.canonicalUrl || "");
  const [featured, setFeatured] = useState(initialPost?.featured || false);
  const [status, setStatus] = useState(initialPost?.status || "draft");

  const [tagInput, setTagInput] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [preview, setPreview] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const readingTime = calculateReadingTime(content);

  const autoSlug = slugify(title);

  const handleSave = useCallback(async (publishStatus?: string) => {
    const postData = {
      title,
      subtitle,
      content,
      excerpt: excerpt || undefined,
      featuredImage: featuredImage || undefined,
      categories,
      tags,
      seoTitle: seoTitle || undefined,
      seoDescription: seoDescription || undefined,
      seoKeywords: seoKeywords.length > 0 ? seoKeywords : undefined,
      canonicalUrl: canonicalUrl || undefined,
      featured,
      orgId,
    };

    const method = isEditing ? "PUT" : "POST";
    const url = isEditing
      ? `/api/blog/admin/${initialPost?.id}`
      : "/api/blog/admin";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });

      if (res.ok) {
        const result = await res.json();
        if (publishStatus === "publish" && result.data?.id) {
          await fetch(`/api/blog/admin/${result.data.id}/publish`, {
            method: "POST",
          });
        }
        router.push("/orgmenu/blog");
        router.refresh();
      }
    } catch (err) {
      console.error("Save failed:", err);
    }
  }, [title, subtitle, content, excerpt, featuredImage, categories, tags, seoTitle, seoDescription, seoKeywords, canonicalUrl, featured, orgId, isEditing, initialPost, router]);

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !seoKeywords.includes(keywordInput.trim())) {
      setSeoKeywords([...seoKeywords, keywordInput.trim()]);
      setKeywordInput("");
    }
  };

  const removeKeyword = (keyword: string) => {
    setSeoKeywords(seoKeywords.filter(k => k !== keyword));
  };

  // Autosave draft every 30 seconds
  useEffect(() => {
    if (!isEditing || status === "published") return;

    const interval = setInterval(() => {
      if (title && content) {
        handleSave();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isEditing, status, title, content, handleSave]);

  if (preview) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setPreview(false)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Editor
          </Button>
        </div>
        <Card>
          <CardContent className="p-8">
            <h1 className="text-3xl font-bold mb-2">{title || "Untitled"}</h1>
            {subtitle && <p className="text-xl text-muted-foreground mb-4">{subtitle}</p>}
            {featuredImage && (
              <img
                src={featuredImage}
                alt={title}
                className="w-full rounded-lg mb-6 object-cover max-h-[400px]"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            {content ? (
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            ) : (
              <p className="text-muted-foreground italic">No content yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Tabs defaultValue="content" className="space-y-6">
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setPreview(true)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSave()}
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button
            onClick={() => handleSave("publish")}
            disabled={publishing || !title || !content}
          >
            <Send className="h-4 w-4 mr-2" />
            Publish
          </Button>
        </div>
      </div>

      <TabsContent value="content" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Post Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter post title..."
              />
              {title && (
                <p className="text-xs text-muted-foreground">
                  Slug: /blog/{autoSlug}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle</Label>
              <Input
                id="subtitle"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Optional subtitle..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <TiptapEditor
                value={content}
                onChange={setContent}
                placeholder="Write your blog post content here..."
              />
              <p className="text-xs text-muted-foreground">
                {readingTime} min read · {content.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length} words
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea
                id="excerpt"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Brief summary of the post (auto-generated if empty)..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Featured Image</Label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingImage}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingImage(true);
                      const formData = new FormData();
                      formData.append("files", file);
                      try {
                        const res = await fetch("/api/files/upload", {
                          method: "POST",
                          body: formData,
                        });
                        if (res.ok) {
                          const data = await res.json();
                          const url = data.data?.[0]?.url || data.data?.url;
                          if (url) setFeaturedImage(url);
                        }
                      } catch (err) {
                        console.error("Upload failed:", err);
                      } finally {
                        setUploadingImage(false);
                      }
                    }}
                    className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 disabled:opacity-50"
                  />
                </div>
                {featuredImage && (
                  <div className="relative">
                    <img
                      src={featuredImage}
                      alt="Preview"
                      className="w-32 h-20 object-cover rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setFeaturedImage("")}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                    >
                      x
                    </button>
                  </div>
                )}
                {uploadingImage && (
                  <div className="w-32 h-20 bg-muted rounded flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                )}
              </div>
              <Input
                value={featuredImage}
                onChange={(e) => setFeaturedImage(e.target.value)}
                placeholder="Or paste image URL..."
                className="text-sm"
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="seo" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>SEO Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="seoTitle">SEO Title</Label>
              <Input
                id="seoTitle"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder={title || "SEO optimized title..."}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                {(seoTitle || title).length}/200 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="seoDescription">Meta Description</Label>
              <Textarea
                id="seoDescription"
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="SEO meta description..."
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {(seoDescription || excerpt).length}/500 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label>SEO Keywords</Label>
              <div className="flex gap-2">
                <Input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  placeholder="Add keyword..."
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                />
                <Button type="button" variant="outline" onClick={addKeyword}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {seoKeywords.map(keyword => (
                  <Badge key={keyword} variant="secondary">
                    {keyword}
                    <button onClick={() => removeKeyword(keyword)} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="canonicalUrl">Canonical URL</Label>
              <Input
                id="canonicalUrl"
                value={canonicalUrl}
                onChange={(e) => setCanonicalUrl(e.target.value)}
                placeholder="https://example.com/blog/post-slug"
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="settings" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Post Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Featured Post</Label>
                <p className="text-sm text-muted-foreground">Show on blog homepage</p>
              </div>
              <Switch checked={featured} onCheckedChange={setFeatured} />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add tag..."
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map(tag => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Categories</Label>
              <Input
                value={categories.join(", ")}
                onChange={(e) => setCategories(e.target.value.split(",").map(c => c.trim()).filter(Boolean))}
                placeholder="Comma-separated categories..."
              />
            </div>

            {isEditing && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
