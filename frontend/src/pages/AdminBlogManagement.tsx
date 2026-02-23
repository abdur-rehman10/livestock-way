import { useEffect, useState, useRef } from "react";
import { API_BASE_URL } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Switch } from "../components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Image as ImageIcon,
  Eye,
  EyeOff,
  ArrowLeft,
  X,
  Bold,
  Italic,
  Heading2,
  List,
  ListOrdered,
  Link as LinkIcon,
  ImagePlus,
  Quote,
  Code,
} from "lucide-react";
import { toast } from "sonner";

interface Blog {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  author: string | null;
  category: string | null;
  tags: string[];
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

type View = "list" | "create" | "edit";

const CATEGORIES = [
  "Platform",
  "Technology",
  "Innovation",
  "Operations",
  "Business",
  "Case Study",
  "Guide",
  "International",
  "News",
];

function getToken() {
  return localStorage.getItem("token") || "";
}

function authHeaders() {
  return {
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  };
}

/* ── Rich Text Toolbar ── */
function RichToolbar({ textareaRef }: { textareaRef: React.RefObject<HTMLTextAreaElement | null> }) {
  function wrap(before: string, after: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = ta.value.substring(start, end) || "text";
    const replacement = `${before}${selected}${after}`;
    ta.setRangeText(replacement, start, end, "select");
    ta.focus();
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function insertLine(prefix: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const before = ta.value.substring(0, pos);
    const lastNewline = before.lastIndexOf("\n");
    const lineStart = lastNewline + 1;
    ta.setRangeText(prefix, lineStart, lineStart, "end");
    ta.focus();
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  }

  const tools = [
    { icon: Bold, action: () => wrap("<strong>", "</strong>"), tip: "Bold" },
    { icon: Italic, action: () => wrap("<em>", "</em>"), tip: "Italic" },
    { icon: Heading2, action: () => wrap("<h2>", "</h2>"), tip: "Heading" },
    { icon: Quote, action: () => wrap("<blockquote>", "</blockquote>"), tip: "Quote" },
    { icon: Code, action: () => wrap("<code>", "</code>"), tip: "Code" },
    { icon: List, action: () => insertLine("<li>"), tip: "List item" },
    { icon: LinkIcon, action: () => wrap('<a href="">', "</a>"), tip: "Link" },
    { icon: ImagePlus, action: () => wrap('<img src="', '" alt="image" />'), tip: "Image" },
  ];

  return (
    <div className="flex flex-wrap gap-1 mb-2 p-2 bg-gray-50 rounded-lg border">
      {tools.map((t) => (
        <button
          key={t.tip}
          type="button"
          onClick={t.action}
          title={t.tip}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
        >
          <t.icon className="w-4 h-4 text-gray-600" />
        </button>
      ))}
    </div>
  );
}

/* ── Blog Form ── */
function BlogForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Blog;
  onSave: (data: Partial<Blog>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [title, setTitle] = useState(initial?.title || "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt || "");
  const [content, setContent] = useState(initial?.content || "");
  const [author, setAuthor] = useState(initial?.author || "");
  const [category, setCategory] = useState(initial?.category || "");
  const [tags, setTags] = useState(initial?.tags?.join(", ") || "");
  const [published, setPublished] = useState(initial?.published || false);
  const [coverImage, setCoverImage] = useState(initial?.cover_image || "");
  const [uploading, setUploading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  async function handleCoverUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("cover", file);
      const res = await fetch(`${API_BASE_URL}/api/blogs/admin/upload-cover`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setCoverImage(data.url);
        toast.success("Cover image uploaded");
      } else {
        toast.error(data.error || "Upload failed");
      }
    } catch {
      toast.error("Upload failed");
    }
    setUploading(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required");
      return;
    }
    onSave({
      title: title.trim(),
      excerpt: excerpt.trim() || null,
      content,
      author: author.trim() || null,
      category: category || null,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      published,
      cover_image: coverImage || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={onCancel}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to list
        </Button>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="published-toggle" className="text-sm">
              {published ? "Published" : "Draft"}
            </Label>
            <Switch
              id="published-toggle"
              checked={published}
              onCheckedChange={setPublished}
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {initial ? "Update" : "Create"} Blog
          </Button>
        </div>
      </div>

      {/* Cover Image */}
      <Card>
        <CardContent className="pt-6">
          <Label className="mb-2 block">Cover Image</Label>
          {coverImage ? (
            <div className="relative">
              <img
                src={
                  coverImage.startsWith("http")
                    ? coverImage
                    : `${API_BASE_URL}${coverImage}`
                }
                alt="Cover"
                className="w-full h-64 object-cover rounded-lg"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => setCoverImage("")}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              {uploading ? (
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              ) : (
                <>
                  <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">
                    Click to upload cover image
                  </span>
                </>
              )}
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleCoverUpload(f);
                }}
              />
            </label>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <Label>Title *</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Blog post title"
            className="mt-1"
            required
          />
        </div>

        <div>
          <Label>Author</Label>
          <Input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Author name"
            className="mt-1"
          />
        </div>

        <div>
          <Label>Category</Label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Select category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <Label>Tags (comma separated)</Label>
          <Input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="AI, Logistics, Transport"
            className="mt-1"
          />
        </div>

        <div className="md:col-span-2">
          <Label>Excerpt</Label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="Short summary for the blog listing..."
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm min-h-[80px] resize-y"
          />
        </div>

        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <Label>Content * (HTML)</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPreviewMode(!previewMode)}
            >
              {previewMode ? (
                <>
                  <EyeOff className="w-4 h-4 mr-1" /> Edit
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-1" /> Preview
                </>
              )}
            </Button>
          </div>

          {previewMode ? (
            <div
              className="prose prose-lg max-w-none p-4 border rounded-lg min-h-[400px] bg-white"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <>
              <RichToolbar textareaRef={contentRef} />
              <textarea
                ref={contentRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your blog content in HTML..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm min-h-[400px] font-mono resize-y"
                required
              />
            </>
          )}
        </div>
      </div>
    </form>
  );
}

/* ── Main Admin Blog Page ── */
export function AdminBlogManagement() {
  const [view, setView] = useState<View>("list");
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editBlog, setEditBlog] = useState<Blog | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<Blog | null>(null);

  async function fetchBlogs(p = 1) {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/blogs/admin/list?page=${p}&limit=20`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      const data = await res.json();
      if (res.ok) {
        setBlogs(data.blogs);
        setPage(data.page);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } catch {
      toast.error("Failed to load blogs");
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchBlogs();
  }, []);

  async function handleCreate(data: Partial<Blog>) {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/blogs/admin`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success("Blog created");
        setView("list");
        fetchBlogs();
      } else {
        toast.error(result.error || "Failed to create");
      }
    } catch {
      toast.error("Failed to create blog");
    }
    setSaving(false);
  }

  async function handleUpdate(data: Partial<Blog>) {
    if (!editBlog) return;
    setSaving(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/blogs/admin/${editBlog.id}`,
        {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify(data),
        }
      );
      const result = await res.json();
      if (res.ok) {
        toast.success("Blog updated");
        setView("list");
        setEditBlog(null);
        fetchBlogs(page);
      } else {
        toast.error(result.error || "Failed to update");
      }
    } catch {
      toast.error("Failed to update blog");
    }
    setSaving(false);
  }

  async function handleDelete(blog: Blog) {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/blogs/admin/${blog.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );
      if (res.ok) {
        toast.success("Blog deleted");
        setDeleteConfirm(null);
        fetchBlogs(page);
      } else {
        toast.error("Failed to delete");
      }
    } catch {
      toast.error("Failed to delete blog");
    }
  }

  if (view === "create") {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <BlogForm
          onSave={handleCreate}
          onCancel={() => setView("list")}
          saving={saving}
        />
      </div>
    );
  }

  if (view === "edit" && editBlog) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <BlogForm
          initial={editBlog}
          onSave={handleUpdate}
          onCancel={() => {
            setView("list");
            setEditBlog(null);
          }}
          saving={saving}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blog Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} blog{total !== 1 ? "s" : ""} total
          </p>
        </div>
        <Button onClick={() => setView("create")}>
          <Plus className="w-4 h-4 mr-2" />
          New Blog Post
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : blogs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ImageIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No blog posts yet
            </h3>
            <p className="text-gray-500 mb-6">
              Create your first blog post to get started.
            </p>
            <Button onClick={() => setView("create")}>
              <Plus className="w-4 h-4 mr-2" />
              Create Blog Post
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {blogs.map((blog) => (
            <Card key={blog.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {blog.cover_image && (
                    <img
                      src={
                        blog.cover_image.startsWith("http")
                          ? blog.cover_image
                          : `${API_BASE_URL}${blog.cover_image}`
                      }
                      alt=""
                      className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {blog.title}
                      </h3>
                      <Badge
                        variant={blog.published ? "default" : "secondary"}
                      >
                        {blog.published ? "Published" : "Draft"}
                      </Badge>
                    </div>
                    {blog.excerpt && (
                      <p className="text-sm text-gray-500 line-clamp-2 mb-2">
                        {blog.excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      {blog.category && <span>{blog.category}</span>}
                      {blog.author && <span>By {blog.author}</span>}
                      <span>
                        {new Date(blog.created_at).toLocaleDateString()}
                      </span>
                      {blog.tags?.length > 0 && (
                        <span>{blog.tags.join(", ")}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setEditBlog(blog);
                        setView("edit");
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => setDeleteConfirm(blog)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => fetchBlogs(page - 1)}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => fetchBlogs(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Blog Post</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600 py-4">
            Are you sure you want to delete &quot;{deleteConfirm?.title}&quot;?
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
