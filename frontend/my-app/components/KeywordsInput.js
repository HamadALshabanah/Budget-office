'use client';
import { useState, useRef } from 'react';
import { Tag, X } from 'lucide-react';

// Chip-style keyword list input (shared by rules page and categories page).
export default function KeywordsInput({ keywords, setKeywords, placeholder, hint }) {
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef(null);

    const addKeyword = (keyword) => {
        const trimmed = keyword.trim();
        if (trimmed && !keywords.includes(trimmed)) {
            setKeywords([...keywords, trimmed]);
        }
        setInputValue('');
    };

    const removeKeyword = (indexToRemove) => {
        setKeywords(keywords.filter((_, index) => index !== indexToRemove));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addKeyword(inputValue);
        } else if (e.key === 'Backspace' && inputValue === '' && keywords.length > 0) {
            removeKeyword(keywords.length - 1);
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedText = e.clipboardData.getData('text');
        const newKeywords = pastedText.split(/[,،\n]+/).map(k => k.trim()).filter(k => k);
        const uniqueNew = newKeywords.filter(k => !keywords.includes(k));
        if (uniqueNew.length > 0) {
            setKeywords([...keywords, ...uniqueNew]);
        }
    };

    return (
        <div>
            <div
                className="min-h-16 p-2 input-field cursor-text"
                onClick={() => inputRef.current?.focus()}
            >
                <div className="flex flex-wrap gap-1">
                    {keywords.map((keyword, index) => (
                        <span key={index} className="badge badge-green group inline-flex items-center gap-1">
                            <Tag className="w-2.5 h-2.5" />
                            {keyword}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeKeyword(index);
                                }}
                                className="ml-0.5 p-0.5 rounded transition-colors hover:bg-[rgba(255,255,255,0.1)]"
                            >
                                <X className="w-2.5 h-2.5" />
                            </button>
                        </span>
                    ))}
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        onBlur={() => inputValue && addKeyword(inputValue)}
                        className="flex-1 min-w-24 p-1 bg-transparent text-sm outline-none"
                        style={{ color: 'var(--text-primary)' }}
                        placeholder={keywords.length === 0 ? placeholder : ''}
                    />
                </div>
            </div>
            <p className="text-[9px] mt-1" style={{ color: 'var(--text-muted)' }}>{hint}</p>
        </div>
    );
}
