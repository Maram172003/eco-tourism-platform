"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { MACRO_CATEGORIES, TAXONOMY_TAGS, type MacroSlug } from "@/lib/constants/taxonomy-tags";

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
  onSuggest?: () => Promise<string[]>;
}

export default function TaxonomyTagPicker({ value, onChange, onSuggest }: Props) {
  const [search, setSearch] = useState("");
  const [manualExpanded, setManualExpanded] = useState<Set<MacroSlug>>(new Set());
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState("");

  function toggle(slug: string) {
    onChange(value.includes(slug) ? value.filter((s) => s !== slug) : [...value, slug]);
  }

  function toggleMacro(macro: MacroSlug) {
    setManualExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(macro)) next.delete(macro); else next.add(macro);
      return next;
    });
  }

  const filteredTags = useMemo(() => {
    if (!search.trim()) return TAXONOMY_TAGS;
    const q = search.toLowerCase();
    return TAXONOMY_TAGS.filter((t) => t.label.toLowerCase().includes(q));
  }, [search]);

  const tagsByMacro = useMemo(() => {
    const map: Partial<Record<MacroSlug, typeof TAXONOMY_TAGS>> = {};
    for (const tag of filteredTags) {
      if (!map[tag.macro]) map[tag.macro] = [];
      map[tag.macro]!.push(tag);
    }
    return map;
  }, [filteredTags]);

  // Auto-expand: macros with selected tags or matching the search query
  const expandedSet = useMemo(() => {
    const set = new Set<MacroSlug>(manualExpanded);
    for (const tag of TAXONOMY_TAGS) {
      if (value.includes(tag.slug)) set.add(tag.macro);
    }
    if (search.trim()) {
      for (const { slug } of MACRO_CATEGORIES) {
        if (tagsByMacro[slug]?.length) set.add(slug);
      }
    }
    return set;
  }, [manualExpanded, value, search, tagsByMacro]);

  const selectedTags = TAXONOMY_TAGS.filter((t) => value.includes(t.slug));

  async function handleSuggest() {
    if (!onSuggest || suggesting) return;
    setSuggesting(true);
    setSuggestError("");
    try {
      const suggested = await onSuggest();
      onChange([...new Set([...value, ...suggested])]);
    } catch {
      setSuggestError("Suggestion indisponible, sélectionne tes tags manuellement.");
      setTimeout(() => setSuggestError(""), 4000);
    } finally {
      setSuggesting(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Suggest button */}
      {onSuggest && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] text-slate-400 leading-snug">
            Analyse le titre & la description pour suggérer des tags pertinents.
          </p>
          <button
            type="button"
            disabled={suggesting}
            onClick={handleSuggest}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/30 text-primary rounded-lg text-[11px] font-bold hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {suggesting ? (
              <>
                <span className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                Analyse…
              </>
            ) : (
              <>✨ Suggérer des tags</>
            )}
          </button>
        </div>
      )}
      {suggestError && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          {suggestError}
        </p>
      )}
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un tag…"
          className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
        />
        {search && (
          <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Macro-categories */}
      <div className="space-y-1 max-h-64 overflow-y-auto pr-0.5">
        {MACRO_CATEGORIES.map(({ slug, label }) => {
          const tags = tagsByMacro[slug] ?? [];
          if (tags.length === 0) return null;
          const isOpen = expandedSet.has(slug);
          const selectedCount = tags.filter((t) => value.includes(t.slug)).length;

          return (
            <div key={slug} className="border border-slate-100 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleMacro(slug)}
                className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-widest">{label}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {selectedCount > 0 && (
                    <span className="text-[10px] font-black bg-primary text-slate-900 px-1.5 py-0.5 rounded-full leading-none">
                      {selectedCount}
                    </span>
                  )}
                  <span className="text-slate-400 text-[10px]">{isOpen ? "▲" : "▼"}</span>
                </div>
              </button>
              {isOpen && (
                <div className="px-3 py-2.5 flex flex-wrap gap-1.5 bg-white">
                  {tags.map((tag) => {
                    const sel = value.includes(tag.slug);
                    return (
                      <button
                        key={tag.slug}
                        type="button"
                        onClick={() => toggle(tag.slug)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                          sel
                            ? "bg-primary text-slate-900 border-primary"
                            : "border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary"
                        }`}
                      >
                        {tag.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected chips */}
      {selectedTags.length > 0 && (
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">
            Tags sélectionnés ({selectedTags.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selectedTags.map((tag) => (
              <button
                key={tag.slug}
                type="button"
                onClick={() => toggle(tag.slug)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors"
              >
                {tag.label} <X className="w-2.5 h-2.5" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
