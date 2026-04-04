'use client';

import { useState, useCallback } from 'react';
import { parseModelIdFromUrl } from '@/lib/api/huggingface';

interface URLInputProps {
  onSubmit: (modelId: string) => void;
}

const EXAMPLES = [
  { label: 'google/gemma-3-27b-it', url: 'https://huggingface.co/google/gemma-3-27b-it' },
  { label: 'Qwen/Qwen3-30B-A3B', url: 'https://huggingface.co/Qwen/Qwen3-30B-A3B' },
  { label: 'deepseek-ai/DeepSeek-V3-0324', url: 'https://huggingface.co/deepseek-ai/DeepSeek-V3-0324' },
];

export default function URLInput({ onSubmit }: URLInputProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const extractModelId = useCallback((value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    // Try as full URL first
    const fromUrl = parseModelIdFromUrl(trimmed);
    if (fromUrl) return fromUrl;
    // Try as plain org/model ID (e.g. "google/gemma-3-27b-it")
    const idPattern = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;
    if (idPattern.test(trimmed)) return trimmed;
    return null;
  }, []);

  const handleSubmit = useCallback(() => {
    const modelId = extractModelId(url);
    if (!modelId) {
      setError('Enter a HuggingFace URL or model ID (e.g. google/gemma-3-27b-it)');
      return;
    }
    setError(null);
    onSubmit(modelId);
  }, [url, extractModelId, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSubmit();
    },
    [handleSubmit],
  );

  const handleExampleClick = useCallback((exampleUrl: string) => {
    setUrl(exampleUrl);
    setError(null);
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    if (error) setError(null);
  }, [error]);

  return (
    <div className="w-full">
      {/* Input row */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={url}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Paste a HuggingFace URL or model ID (e.g. google/gemma-3-27b-it)"
            className={`
              w-full rounded-lg border px-4 py-3 text-sm
              bg-[#FFFFFF] text-[#0F172A] placeholder-[#94A3B8]
              outline-none transition-colors duration-150
              ${error
                ? 'border-[#EF4444] focus:border-[#EF4444]'
                : 'border-[#E2E8F0] focus:border-[#6366F1]'
              }
            `}
          />
        </div>
        <button
          onClick={handleSubmit}
          className="
            shrink-0 rounded-lg bg-[#6366F1] px-5 py-3 text-sm font-medium
            text-white transition-colors duration-150
            hover:bg-[#5558E6] active:bg-[#4F46E5]
            cursor-pointer
          "
        >
          X-ray this model
        </button>
      </div>

      {/* Validation error */}
      {error && (
        <p className="mt-2 text-sm text-[#EF4444]">{error}</p>
      )}

      {/* Example links */}
      <p className="mt-3 text-sm text-[#94A3B8]">
        Try:{' '}
        {EXAMPLES.map((example, i) => (
          <span key={example.label}>
            {i > 0 && <span className="mx-1">|</span>}
            <button
              onClick={() => handleExampleClick(example.url)}
              className="
                text-[#6366F1] underline decoration-[#6366F1]/30
                hover:decoration-[#6366F1] transition-colors duration-150
                cursor-pointer
              "
            >
              {example.label}
            </button>
          </span>
        ))}
      </p>
    </div>
  );
}
