import axios from 'axios';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppBar } from '../components/AppBar';
import { BACKEND_URL } from '../config';

const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });

interface ProfileData {
  id: string;
  username?: string;
  name?: string;
  headline?: string;
  bio?: string;
  avatarUrl?: string;
  website?: string;
  location?: string;
  followed: boolean;
  blocked: boolean;
  muted: boolean;
  isOwn: boolean;
  _count: { posts: number; followers: number; following: number };
}

interface ProfileStory {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  tags: string[];
  publishedAt?: string;
  coverImageUrl?: string;
  _count: { claps: number; comments: number };
}

export const Profile = () => {
  const { identifier = '' } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData>();
  const [stories, setStories] = useState<ProfileStory[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      axios.get(`${BACKEND_URL}/api/v1/community/profile/${identifier}`, {
        headers: localStorage.getItem('token') ? headers() : undefined
      }),
      axios.get(`${BACKEND_URL}/api/v1/community/profile/${identifier}/stories`)
    ])
      .then(([profileResponse, storiesResponse]) => {
        setProfile(profileResponse.data.profile);
        setStories(storiesResponse.data.stories || []);
      })
      .catch(() => setError('This author profile could not be found.'));
  }, [identifier]);

  const requireAccount = () => {
    if (localStorage.getItem('token')) return true;
    navigate('/signin', { state: { from: `/author/${identifier}` } });
    return false;
  };

  const follow = async () => {
    if (!profile || !requireAccount()) return;
    const next = !profile.followed;
    const response = await axios.post(
      `${BACKEND_URL}/api/v1/blog/author/${profile.id}/follow`,
      { followed: next },
      { headers: headers() }
    );
    setProfile({
      ...profile,
      followed: next,
      _count: { ...profile._count, followers: response.data.followerCount }
    });
  };

  const safety = async (action: 'mute' | 'block') => {
    if (!profile || !requireAccount()) return;
    const enabled = action === 'mute' ? !profile.muted : !profile.blocked;
    await axios.post(
      `${BACKEND_URL}/api/v1/community/users/${profile.id}/${action}`,
      { enabled },
      { headers: headers() }
    );
    setProfile({ ...profile, [action === 'mute' ? 'muted' : 'blocked']: enabled });
  };

  const report = async () => {
    if (!profile || !requireAccount()) return;
    const details = window.prompt('Why are you reporting this profile?') || undefined;
    await axios.post(
      `${BACKEND_URL}/api/v1/community/reports`,
      { userId: profile.id, reason: 'other', details },
      { headers: headers() }
    );
    setError('Report received. Our moderation records now include it.');
  };

  if (error && !profile)
    return (
      <div className="page-shell">
        <AppBar />
        <main className="container-main py-24 text-center">
          <h1 className="font-display text-4xl font-semibold">Author unavailable</h1>
          <p className="mt-3 text-[var(--muted)]">{error}</p>
        </main>
      </div>
    );
  if (!profile)
    return (
      <div className="page-shell">
        <AppBar />
        <p className="py-24 text-center text-[var(--muted)]">Loading author…</p>
      </div>
    );

  return (
    <div className="page-shell">
      <AppBar />
      <main className="container-main max-w-5xl py-12">
        <header className="rounded-3xl bg-[#10213d] p-8 text-white md:p-12">
          <div className="flex flex-col justify-between gap-7 sm:flex-row sm:items-start">
            <div className="flex gap-5">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
              ) : (
                <div className="grid h-20 w-20 place-items-center rounded-full bg-[#2563eb] font-display text-3xl font-bold">
                  {(profile.name || profile.username || 'A')[0].toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="font-display text-4xl font-semibold">
                  {profile.name || profile.username || 'Inkwell author'}
                </h1>
                {profile.username && <p className="mt-1 text-[#93c5fd]">@{profile.username}</p>}
                {profile.headline && <p className="mt-3 max-w-xl text-white/80">{profile.headline}</p>}
              </div>
            </div>
            {profile.isOwn ? (
              <Link
                to="/settings/profile"
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#10213d]"
              >
                Edit profile
              </Link>
            ) : (
              <button
                onClick={() => void follow()}
                className="rounded-lg bg-[#2563eb] px-5 py-2.5 text-sm font-semibold"
              >
                {profile.followed ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
          {profile.bio && (
            <p className="mt-7 max-w-2xl whitespace-pre-wrap leading-7 text-white/80">{profile.bio}</p>
          )}
          <div className="mt-7 flex flex-wrap gap-5 text-sm text-white/70">
            <span>{profile._count.posts} stories</span>
            <span>{profile._count.followers} followers</span>
            <span>{profile._count.following} following</span>
            {profile.location && <span>{profile.location}</span>}
            {profile.website && (
              <a className="underline" href={profile.website} target="_blank" rel="noreferrer">
                Website
              </a>
            )}
          </div>
          {!profile.isOwn && (
            <div className="mt-7 flex gap-4 text-xs font-semibold text-white/60">
              <button onClick={() => void safety('mute')}>{profile.muted ? 'Unmute' : 'Mute'}</button>
              <button onClick={() => void safety('block')}>{profile.blocked ? 'Unblock' : 'Block'}</button>
              <button onClick={() => void report()}>Report</button>
            </div>
          )}
        </header>
        {error && <p className="mt-5 rounded-lg bg-[#eff6ff] p-3 text-sm text-[#1d4ed8]">{error}</p>}
        <section className="py-12">
          <h2 className="font-display text-4xl font-semibold">Published stories</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {stories.map((story) => (
              <Link
                key={story.id}
                to={`/story/${story.slug}`}
                className="rounded-2xl border border-[var(--line)] bg-white p-6 transition hover:-translate-y-1"
              >
                <p className="text-xs font-bold uppercase tracking-[.12em] text-[#2563eb]">
                  {story.tags[0] || 'Story'}
                </p>
                <h3 className="mt-3 font-display text-3xl font-semibold">{story.title}</h3>
                {story.excerpt && (
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--muted)]">{story.excerpt}</p>
                )}
                <p className="mt-5 text-xs text-[var(--muted)]">
                  {story._count.claps} appreciations · {story._count.comments} comments
                </p>
              </Link>
            ))}
            {!stories.length && <p className="text-[var(--muted)]">No published stories yet.</p>}
          </div>
        </section>
      </main>
    </div>
  );
};
