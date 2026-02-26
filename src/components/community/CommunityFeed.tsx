"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";

// ─── Types ───────────────────────────────────────────────────────────────────
type ZoneFilter = "all" | "game" | "website" | "anime" | "saas" | "video";

interface Post {
  id: string;
  user_id: string;
  zone_type: string | null;
  title: string;
  description: string;
  preview_url: string | null;
  like_count: number;
  comment_count: number;
  created_at: string;
  author_email?: string;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  author_email?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const ZONE_FILTERS: { label: string; value: ZoneFilter }[] = [
  { label: "All", value: "all" },
  { label: "Games", value: "game" },
  { label: "Websites", value: "website" },
  { label: "Anime", value: "anime" },
  { label: "SaaS", value: "saas" },
  { label: "Video", value: "video" },
];

const ZONE_COLORS: Record<string, string> = {
  game: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  website: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  anime: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  saas: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  video: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
};

// ─── Share Project Modal ──────────────────────────────────────────────────────
function ShareModal({ onClose, onPosted }: { onClose: () => void; onPosted: () => void }) {
  const supabase = createClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [zone, setZone] = useState<string>("game");
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required.");
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("You must be logged in."); setLoading(false); return; }

    const { error: err } = await supabase.from("community_posts").insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim(),
      zone_type: zone,
      preview_url: previewUrl.trim() || null,
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    onPosted();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Share Your Project</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Zone</label>
            <select
              value={zone}
              onChange={e => setZone(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="game">Game</option>
              <option value="website">Website</option>
              <option value="anime">Anime</option>
              <option value="saas">SaaS</option>
              <option value="video">Video</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="My awesome project"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              placeholder="Tell the community what you built..."
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preview URL (optional)</label>
            <input
              type="url"
              value={previewUrl}
              onChange={e => setPreviewUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-medium py-2.5 text-sm transition-colors"
          >
            {loading ? "Posting…" : "Post to Community"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Comment Thread ───────────────────────────────────────────────────────────
function CommentThread({ postId, open }: { postId: string; open: boolean }) {
  const supabase = createClient();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from("post_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    setComments(data ?? []);
    setFetched(true);
  }, [postId, supabase]);

  useEffect(() => {
    if (!open || fetched) return;
    fetchComments();
    const channel = supabase
      .channel(`comments:${postId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "post_comments", filter: `post_id=eq.${postId}` }, fetchComments)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [open, fetched, postId, fetchComments, supabase]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    await supabase.from("post_comments").insert({ post_id: postId, user_id: user.id, body: body.trim() });
    setBody("");
    setLoading(false);
  };

  if (!open) return null;

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
      <div className="flex flex-col gap-2 mb-3 max-h-48 overflow-y-auto">
        {comments.length === 0 && <p className="text-xs text-gray-400">No comments yet. Be the first!</p>}
        {comments.map(c => (
          <div key={c.id} className="flex gap-2 text-sm">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-brand-600 dark:text-brand-300 font-bold text-xs uppercase">
              {c.user_id.slice(0, 2)}
            </span>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-1.5 flex-1">
              <p className="text-gray-800 dark:text-gray-200">{c.body}</p>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Add a comment…"
          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white px-4 py-2 text-sm font-medium transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────
function PostCard({ post, currentUserId }: { post: Post; currentUserId: string | null }) {
  const supabase = createClient();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comment_count);

  useEffect(() => {
    if (!currentUserId) return;
    supabase.from("post_likes").select("post_id").eq("post_id", post.id).eq("user_id", currentUserId).single()
      .then(({ data }) => setLiked(!!data));
  }, [post.id, currentUserId, supabase]);

  // Realtime like + comment count
  useEffect(() => {
    const channel = supabase.channel(`post-card:${post.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "community_posts", filter: `id=eq.${post.id}` },
        payload => {
          setLikeCount((payload.new as Post).like_count);
          setCommentCount((payload.new as Post).comment_count);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [post.id, supabase]);

  const toggleLike = async () => {
    if (!currentUserId) return;
    if (liked) {
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", currentUserId);
      setLiked(false);
    } else {
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: currentUserId });
      setLiked(true);
    }
  };

  const zoneColor = post.zone_type ? ZONE_COLORS[post.zone_type] ?? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" : "";
  const ago = new Date(post.created_at).toLocaleDateString();

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm hover:shadow-md transition-shadow">
      {post.preview_url && (
        <img src={post.preview_url} alt={post.title} className="w-full h-40 object-cover rounded-xl mb-4" />
      )}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white leading-snug">{post.title}</h3>
        {post.zone_type && (
          <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full capitalize ${zoneColor}`}>
            {post.zone_type}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4">{post.description}</p>
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{ago}</span>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleLike}
            className={`flex items-center gap-1 transition-colors ${liked ? "text-red-500" : "hover:text-red-400"}`}
          >
            <svg className="w-4 h-4" fill={liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span>{likeCount}</span>
          </button>
          <button
            onClick={() => setCommentsOpen(o => !o)}
            className="flex items-center gap-1 hover:text-brand-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>{commentCount}</span>
          </button>
        </div>
      </div>
      <CommentThread postId={post.id} open={commentsOpen} />
    </div>
  );
}

// ─── Main Feed ────────────────────────────────────────────────────────────────
export default function CommunityFeed() {
  const supabase = createClient();
  const [posts, setPosts] = useState<Post[]>([]);
  const [filter, setFilter] = useState<ZoneFilter>("all");
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, [supabase]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("community_posts").select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("zone_type", filter);
    const { data } = await q;
    setPosts(data ?? []);
    setLoading(false);
  }, [filter, supabase]);

  useEffect(() => {
    fetchPosts();
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const ch = supabase.channel("community_posts_feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_posts" }, () => fetchPosts())
      .subscribe();
    channelRef.current = ch;
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [fetchPosts, supabase]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Community</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Discover & share projects built with the platform</p>
        </div>
        <button
          onClick={() => setShowShare(true)}
          className="flex items-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 text-sm font-medium transition-colors shadow"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Share Project
        </button>
      </div>

      {/* Filters */}
      <div className="max-w-4xl mx-auto mb-6 flex gap-2 flex-wrap">
        {ZONE_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              filter === f.value
                ? "bg-brand-500 text-white border-brand-500"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-brand-400"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="max-w-4xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800 h-48" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm">No posts yet in this category. Be the first!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {posts.map(p => (
              <PostCard key={p.id} post={p} currentUserId={currentUserId} />
            ))}
          </div>
        )}
      </div>

      {showShare && <ShareModal onClose={() => setShowShare(false)} onPosted={fetchPosts} />}
    </div>
  );
}
