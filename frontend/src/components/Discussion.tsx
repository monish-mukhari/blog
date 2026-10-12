import axios from 'axios';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BACKEND_URL } from '../config';

const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });

interface Comment {
  id: string;
  body: string;
  status: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  author: { id: string; username?: string; name?: string; avatarUrl?: string };
}

export const Discussion = ({ postId }: { postId: string }) => {
  const navigate = useNavigate();
  const signedIn = Boolean(localStorage.getItem('token'));
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<Comment>();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    axios
      .get(`${BACKEND_URL}/api/v1/community/posts/${postId}/comments`, {
        headers: signedIn ? headers() : undefined
      })
      .then((response) => setComments(response.data.comments || []))
      .catch(() => setError('The discussion could not be loaded.'));
  }, [postId, signedIn]);

  useEffect(load, [load]);

  const roots = useMemo(() => comments.filter((comment) => !comment.parentId), [comments]);
  const replies = useMemo(() => {
    const grouped = new Map<string, Comment[]>();
    for (const comment of comments.filter((item) => item.parentId)) {
      const current = grouped.get(comment.parentId!) || [];
      current.push(comment);
      grouped.set(comment.parentId!, current);
    }
    return grouped;
  }, [comments]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!signedIn) {
      navigate('/signin');
      return;
    }
    setSubmitting(true);
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/v1/community/posts/${postId}/comments`,
        { body, parentId: replyTo?.id },
        { headers: headers() }
      );
      setComments((current) => [...current, response.data.comment]);
      setBody('');
      setReplyTo(undefined);
      setError('');
    } catch (requestError) {
      setError(
        axios.isAxiosError(requestError)
          ? requestError.response?.data?.error || 'Comment could not be posted.'
          : 'Comment could not be posted.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (comment: Comment) => {
    if (!window.confirm('Remove this comment?')) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/v1/community/comments/${comment.id}`, { headers: headers() });
      setComments((current) =>
        current.map((item) =>
          item.id === comment.id ? { ...item, body: '[Comment removed]', status: 'removed' } : item
        )
      );
    } catch {
      setError('Only the commenter or story author can remove this comment.');
    }
  };

  const report = async (comment: Comment) => {
    if (!signedIn) return navigate('/signin');
    const details = window.prompt('Briefly explain the problem (optional):') || undefined;
    try {
      await axios.post(
        `${BACKEND_URL}/api/v1/community/reports`,
        { commentId: comment.id, userId: comment.author.id, reason: 'other', details },
        { headers: headers() }
      );
      setError('Report received. Thank you for helping protect the community.');
    } catch {
      setError('The report could not be submitted.');
    }
  };

  return (
    <section
      className="container-main max-w-3xl border-t border-[var(--line)] py-14"
      aria-labelledby="discussion-title"
    >
      <p className="text-xs font-bold uppercase tracking-[.14em] text-[#2563eb]">Healthy discussion</p>
      <h2 id="discussion-title" className="mt-2 font-display text-4xl font-semibold">
        Discussion <span className="text-[var(--muted)]">{comments.length}</span>
      </h2>
      <form
        onSubmit={submit}
        className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"
      >
        {replyTo && (
          <div className="mb-3 flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs">
            <span>Replying to {replyTo.author.name || replyTo.author.username || 'a reader'}</span>
            <button type="button" onClick={() => setReplyTo(undefined)} className="font-semibold">
              Cancel
            </button>
          </div>
        )}
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={
            signedIn
              ? 'Add to the discussion. Use @username to mention someone.'
              : 'Sign in to join the discussion.'
          }
          maxLength={3000}
          className="min-h-28 w-full resize-y rounded-xl border border-[var(--line)] bg-white p-4 text-sm outline-none focus:border-[#2563eb]"
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-[var(--muted)]">Be curious, specific, and kind.</span>
          <button
            disabled={submitting || !body.trim()}
            className="rounded-lg bg-[#2563eb] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting ? 'Posting…' : 'Post comment'}
          </button>
        </div>
      </form>
      {error && (
        <p role="status" className="mt-3 text-sm text-[var(--muted)]">
          {error}
        </p>
      )}
      <div className="mt-8 space-y-6">
        {roots.map((comment) => (
          <CommentCard
            key={comment.id}
            comment={comment}
            replies={replies.get(comment.id) || []}
            signedIn={signedIn}
            onReply={setReplyTo}
            onRemove={remove}
            onReport={report}
          />
        ))}
        {!roots.length && (
          <p className="rounded-xl border border-dashed border-[var(--line)] p-8 text-center text-sm text-[var(--muted)]">
            Start a thoughtful conversation about this story.
          </p>
        )}
      </div>
    </section>
  );
};

const CommentCard = ({
  comment,
  replies,
  signedIn,
  onReply,
  onRemove,
  onReport
}: {
  comment: Comment;
  replies: Comment[];
  signedIn: boolean;
  onReply: (comment: Comment) => void;
  onRemove: (comment: Comment) => void;
  onReport: (comment: Comment) => void;
}) => (
  <article>
    <div className="rounded-xl border border-[var(--line)] bg-white p-5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <Link
          to={`/author/${comment.author.username || comment.author.id}`}
          className="font-semibold hover:text-[#2563eb]"
        >
          {comment.author.name || comment.author.username || 'Reader'}
        </Link>
        <time className="text-xs text-[var(--muted)]">
          {new Date(comment.createdAt).toLocaleDateString()}
        </time>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">{comment.body}</p>
      {comment.status === 'visible' && (
        <div className="mt-3 flex gap-4 text-xs font-semibold text-[var(--muted)]">
          {signedIn && (
            <button type="button" onClick={() => onReply(comment)}>
              Reply
            </button>
          )}
          {signedIn && (
            <button type="button" onClick={() => void onReport(comment)}>
              Report
            </button>
          )}
          {signedIn && (
            <button type="button" onClick={() => void onRemove(comment)}>
              Remove
            </button>
          )}
        </div>
      )}
    </div>
    {replies.length > 0 && (
      <div className="ml-6 mt-3 space-y-3 border-l-2 border-[var(--line)] pl-4">
        {replies.map((reply) => (
          <div key={reply.id} className="rounded-xl bg-[var(--surface)] p-4 text-sm">
            <div className="flex justify-between gap-3">
              <Link to={`/author/${reply.author.username || reply.author.id}`} className="font-semibold">
                {reply.author.name || reply.author.username || 'Reader'}
              </Link>
              <time className="text-xs text-[var(--muted)]">
                {new Date(reply.createdAt).toLocaleDateString()}
              </time>
            </div>
            <p className="mt-2 whitespace-pre-wrap leading-6 text-[var(--muted)]">{reply.body}</p>
            {signedIn && reply.status === 'visible' && (
              <div className="mt-2 flex gap-3 text-xs font-semibold text-[var(--muted)]">
                <button type="button" onClick={() => onReply(comment)}>
                  Reply
                </button>
                <button type="button" onClick={() => void onReport(reply)}>
                  Report
                </button>
                <button type="button" onClick={() => void onRemove(reply)}>
                  Remove
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    )}
  </article>
);
