import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CopyButton({
  text,
  tooltip = 'Copy',
  size = 14,
  label = null,
  showLabelOnCopy = true,
  className = ''
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    if (!text && text !== 0) return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(String(text));
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = String(text);
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (err) {
      console.warn('Clipboard write error', err);
    }
  };

  return (
    <button
      type="button"
      className={`copy-btn-compact ${copied ? 'copied' : ''} ${className}`}
      onClick={handleCopy}
      title={copied ? 'Copied to clipboard!' : tooltip}
      aria-label={tooltip}
    >
      {copied ? (
        <Check size={size} className="copy-icon-check" strokeWidth={2.5} />
      ) : (
        <Copy size={size} className="copy-icon-default" />
      )}
      {label && <span className="copy-btn-label">{label}</span>}
      {copied && showLabelOnCopy && (
        <span className="copy-badge-inline">Copied</span>
      )}
    </button>
  );
}
