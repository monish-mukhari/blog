import axios from 'axios';
import { ChangeEvent, useState } from 'react';
import { BACKEND_URL } from '../config';
import { processImage } from '../lib/image';

interface UploadedMedia {
  url: string;
  alt: string;
}

interface ImageUploaderProps {
  title: string;
  description: string;
  currentUrl?: string;
  initialAlt?: string;
  includeCaption?: boolean;
  onUploaded: (media: UploadedMedia & { caption?: string }) => void;
  onRemove?: () => void;
  onAltChange?: (alt: string) => void;
}

export const ImageUploader = ({
  title,
  description,
  currentUrl,
  initialAlt = '',
  includeCaption = false,
  onUploaded,
  onRemove,
  onAltChange
}: ImageUploaderProps) => {
  const [alt, setAlt] = useState(initialAlt);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!alt.trim()) {
      setError('Describe the image first so screen-reader users can understand it.');
      return;
    }

    setUploading(true);
    setError('');
    try {
      const processed = await processImage(file);
      const response = await axios.post(
        `${BACKEND_URL}/api/v1/media`,
        { ...processed, alt: alt.trim() },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } }
      );
      onUploaded({ url: response.data.media.url, alt: alt.trim(), caption: caption.trim() || undefined });
      if (includeCaption) {
        setAlt('');
        setCaption('');
      }
    } catch (uploadError) {
      setError(
        axios.isAxiosError(uploadError)
          ? uploadError.response?.data?.error || 'The image could not be uploaded.'
          : uploadError instanceof Error
            ? uploadError.message
            : 'The image could not be uploaded.'
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="rounded-xl border border-[var(--line)] bg-white p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{description}</p>
        </div>
        {currentUrl && onRemove && (
          <button type="button" onClick={onRemove} className="text-xs font-semibold text-[#2563eb]">
            Remove
          </button>
        )}
      </div>
      {currentUrl && (
        <img src={currentUrl} alt={initialAlt} className="mt-4 max-h-52 w-full rounded-lg object-cover" />
      )}
      <label className="mt-4 block text-xs font-semibold" htmlFor={`${title}-alt`}>
        Alternative text
      </label>
      <input
        id={`${title}-alt`}
        value={alt}
        onChange={(event) => {
          setAlt(event.target.value);
          onAltChange?.(event.target.value);
        }}
        maxLength={200}
        placeholder="Describe what the image communicates"
        className="mt-2 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[#2563eb]"
      />
      {includeCaption && (
        <>
          <label className="mt-3 block text-xs font-semibold" htmlFor={`${title}-caption`}>
            Caption (optional)
          </label>
          <input
            id={`${title}-caption`}
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            maxLength={240}
            placeholder="Add context or a source"
            className="mt-2 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm outline-none focus:border-[#2563eb]"
          />
        </>
      )}
      <label className="mt-4 inline-flex cursor-pointer rounded-lg bg-[#2563eb] px-4 py-2 text-xs font-semibold text-white">
        {uploading ? 'Processing and uploading…' : currentUrl ? 'Replace image' : 'Choose image'}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={upload}
          disabled={uploading}
          className="sr-only"
        />
      </label>
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </section>
  );
};
