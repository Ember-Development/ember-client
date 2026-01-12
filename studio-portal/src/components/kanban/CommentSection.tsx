"use client";

import { useState, useEffect, useRef } from "react";

interface Comment {
  id: string;
  content: string;
  author: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  replies: Comment[];
  createdAt: string;
  updatedAt: string;
}

interface CommentSectionProps {
  deliverableId: string;
  projectId: string;
  highlightCommentId?: string | null;
}

export function CommentSection({ deliverableId, projectId, highlightCommentId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commentRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    fetchComments();
  }, [deliverableId]);

  // Scroll to highlighted comment when comments are loaded
  useEffect(() => {
    if (highlightCommentId && comments.length > 0) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const commentElement = commentRefs.current[highlightCommentId];
        if (commentElement) {
          commentElement.scrollIntoView({ behavior: "smooth", block: "center" });
          // Add a highlight effect
          commentElement.classList.add("ring-2", "ring-blue-500", "ring-offset-2");
          setTimeout(() => {
            commentElement.classList.remove("ring-2", "ring-blue-500", "ring-offset-2");
          }, 2000);
        }
      }, 100);
    }
  }, [highlightCommentId, comments]);

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/deliverables/${deliverableId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/deliverables/${deliverableId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment }),
      });

      if (response.ok) {
        const data = await response.json();
        setComments((prev) => [...prev, data.comment]);
        setNewComment("");
      }
    } catch (error) {
      console.error("Failed to post comment:", error);
      alert("Failed to post comment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    const content = replyContent[parentId];
    if (!content || !content.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/deliverables/${deliverableId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyContent[parentId], parentId }),
      });

      if (response.ok) {
        const data = await response.json();
        // Recursively update comments to add the new reply
        const updateCommentsRecursively = (comments: Comment[]): Comment[] => {
          return comments.map((comment) => {
            if (comment.id === parentId) {
              return { ...comment, replies: [...comment.replies, data.comment] };
            }
            if (comment.replies.length > 0) {
              return { ...comment, replies: updateCommentsRecursively(comment.replies) };
            }
            return comment;
          });
        };
        setComments(updateCommentsRecursively(comments));
        setReplyContent((prev) => ({ ...prev, [parentId]: "" }));
        setReplyingTo(null);
      }
    } catch (error) {
      console.error("Failed to post reply:", error);
      alert("Failed to post reply. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getAuthorName = (author: Comment["author"]) => {
    return author.firstName && author.lastName
      ? `${author.firstName} ${author.lastName}`
      : author.email;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Recursive component to render comments and nested replies
  const renderComment = (comment: Comment, depth: number = 0) => {
    const isHighlighted = highlightCommentId === comment.id;
    const avatarSize = depth === 0 ? "w-8 h-8" : depth === 1 ? "w-6 h-6" : "w-5 h-5";
    const avatarBg = depth === 0 ? "bg-blue-600" : depth === 1 ? "bg-slate-400" : "bg-slate-300";
    const textSize = depth === 0 ? "text-sm" : "text-xs";
    const indentClass = depth > 0 ? "pl-4 border-l-2 border-slate-200" : "";

    return (
      <div
        key={comment.id}
        ref={(el) => {
          commentRefs.current[comment.id] = el;
        }}
        className={`transition-all ${indentClass} ${depth > 0 ? "mt-3" : ""}`}
      >
        <div className={`flex gap-3 ${depth > 0 ? "" : "bg-slate-50 rounded-lg p-4 border border-slate-200"}`}>
          <div className={`${avatarSize} rounded-full ${avatarBg} flex items-center justify-center text-white ${textSize} font-semibold shrink-0`}>
            {getAuthorName(comment.author).charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`${textSize} font-semibold text-slate-900`}>
                {getAuthorName(comment.author)}
              </span>
              <span className={`${textSize} text-slate-500`}>
                {formatDate(comment.createdAt)}
              </span>
            </div>
            <p className={`${textSize} text-slate-700 whitespace-pre-wrap mb-2`}>
              {comment.content}
            </p>
            
            {/* Reply Button */}
            <button
              onClick={() => {
                setReplyingTo(replyingTo === comment.id ? null : comment.id);
                if (replyingTo !== comment.id) {
                  setTimeout(() => {
                    const replyTextarea = document.getElementById(`reply-${comment.id}`) as HTMLTextAreaElement;
                    replyTextarea?.focus();
                  }, 100);
                }
              }}
              className={`${textSize} font-medium text-blue-600 hover:text-blue-700 mb-2`}
            >
              {replyingTo === comment.id ? "Cancel" : "Reply"}
            </button>

            {/* Reply Form */}
            {replyingTo === comment.id && (
              <div className="mt-2 mb-3">
                <textarea
                  id={`reply-${comment.id}`}
                  value={replyContent[comment.id] || ""}
                  onChange={(e) =>
                    setReplyContent((prev) => ({
                      ...prev,
                      [comment.id]: e.target.value,
                    }))
                  }
                  placeholder="Write a reply..."
                  rows={2}
                  className={`w-full px-3 py-2 ${textSize} text-slate-900 rounded border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none`}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleSubmitReply(comment.id)}
                    disabled={loading || !replyContent[comment.id]?.trim()}
                    className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reply
                  </button>
                  <button
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyContent((prev) => ({ ...prev, [comment.id]: "" }));
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Recursively render nested replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-4 space-y-3">
                {comment.replies.map((reply) => renderComment(reply, depth + 1))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <label className="block text-sm font-semibold text-slate-900">
          Comments ({comments.length})
        </label>
      </div>

      {/* Comments List */}
      <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm font-medium text-slate-500 italic text-center py-4">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => renderComment(comment, 0))
        )}
      </div>

      {/* New Comment Form */}
      <form onSubmit={handleSubmitComment} className="border-t border-slate-300 pt-4">
        <textarea
          ref={textareaRef}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows={3}
          className="w-full px-4 py-3 text-sm text-slate-900 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none placeholder:text-slate-400"
        />
        <div className="flex justify-end gap-2 mt-2">
          <button
            type="submit"
            disabled={loading || !newComment.trim()}
            className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Posting..." : "Post Comment"}
          </button>
        </div>
      </form>
    </div>
  );
}

