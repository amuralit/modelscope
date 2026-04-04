'use client';

import { useState, useCallback } from 'react';
import { parseModelIdFromUrl } from '@/lib/api/huggingface';

interface URLInputProps {
  onSubmit: (modelId: string) => void;
}

const EXAMPLES = [
  { label: 'google/gemma-3-27b-it', url: 'https://huggingface.co/google/gemma-3-27b-it' },
  { label: 'meta-llama/Llama-4-Scout-17B-16E-Instruct', url: 'https://huggingface.co/meta-llama/Llama-4-Scout-17B-16E-Instruct' },
  { label: 'Qwen/Qwen3-30B-A3B', url: 'https://huggingface.co/Qwen/Qwen3-30B-A3B' },
];

export default function URLInput({ onSubmit }: URLInputProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback((value: string): string | null => {
    if (!value.trim()) return 'Please enter a HuggingFace model URL.';
    const modelId = parseModelIdFromUrl(value.trim());
    if (!modelId) return 'Invalid URL. Expected format: https://huggingface.co/{org}/{model}';
    return null;
  }, []);

  const handleSubmit = useCallback(() => {
    const validationError = validate(url);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    const modelId = parseModelIdFromUrl(url.trim());
    if (modelId) onSubmit(modelId);
  }, [url, validate, onSubmit]);

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
            placeholder="Paste a HuggingFace model URL..."
            className={`
              w-full rounded-lg border px-4 py-3 text-sm
              bg-[#111827] text-[#F9FAFB] placeholder-[#6B7280]
              outline-none transition-colors duration-150
              ${error
                ? 'border-[#EF4444] focus:border-[#EF4444]'
                : 'border-[#1F2937] focus:border-[#6366F1]'
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
      <p className="mt-3 text-sm text-[#6B7280]">
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
