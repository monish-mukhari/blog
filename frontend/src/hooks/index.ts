import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '../config';

export interface Blog {
  content?: string;
  contentPreview?: string;
  readingTime?: number;
  title: string;
  id: string;
  slug?: string;
  excerpt?: string;
  tags?: string[];
  createdAt?: string;
  clapCount?: number;
  saved?: boolean;
  liked?: boolean;
  author: { id: string; name?: string; followed?: boolean; followerCount?: number };
}

interface BlogQuery {
  search?: string;
  topic?: string;
  saved?: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : undefined;
};

export const useBlog = ({ id }: { id: string }) => {
  const [loading, setLoading] = useState(true);
  const [blog, setBlog] = useState<Blog>();
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    axios
      .get(`${BACKEND_URL}/api/v1/blog/${id}`, { headers: authHeaders() })
      .then((response) => setBlog(response.data.blog))
      .catch(() => setError('We could not load this story. Please try again.'))
      .finally(() => setLoading(false));
  }, [id]);

  return { loading, blog, error };
};

export const useBlogs = ({ search = '', topic = '', saved = false }: BlogQuery) => {
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 12, total: 0, hasMore: false });
  const [error, setError] = useState('');
  const latestRequest = useRef(0);

  const requestPage = useCallback(
    async (page: number, append: boolean) => {
      const requestId = ++latestRequest.current;
      append ? setLoadingMore(true) : setLoading(true);
      setError('');
      try {
        const response = await axios.get(`${BACKEND_URL}/api/v1/blog/bulk`, {
          headers: authHeaders(),
          params: {
            page,
            limit: 12,
            search: search || undefined,
            topic: topic || undefined,
            saved: saved || undefined
          }
        });
        if (requestId !== latestRequest.current) return;
        const receivedBlogs = response.data.blogs || [];
        setBlogs((current) => (append ? [...current, ...receivedBlogs] : receivedBlogs));
        setPagination(
          response.data.pagination || {
            page,
            limit: receivedBlogs.length,
            total: receivedBlogs.length,
            hasMore: false
          }
        );
      } catch (requestError) {
        if (requestId !== latestRequest.current) return;
        const status = axios.isAxiosError(requestError) ? requestError.response?.status : undefined;
        setError(
          status === 401
            ? 'Sign in to view your saved stories.'
            : 'Stories are taking longer than expected. Please retry.'
        );
        if (!append) setBlogs([]);
      } finally {
        if (requestId === latestRequest.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [saved, search, topic]
  );

  useEffect(() => {
    requestPage(1, false);
  }, [requestPage]);

  return {
    loading,
    loadingMore,
    blogs,
    error,
    total: pagination.total,
    hasMore: pagination.hasMore,
    reload: () => requestPage(1, false),
    loadMore: () => pagination.hasMore && requestPage(pagination.page + 1, true)
  };
};
