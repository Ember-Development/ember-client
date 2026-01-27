"use client";

import { RichTextEditor } from "./RichTextEditor";

interface NoteEditorProps {
  content: string | null;
  onChange: (content: string) => void;
}

/**
 * NoteEditor - A simple rich text editor for project notes
 * Uses the same RichTextEditor component but with a note-specific context
 */
export function NoteEditor({ content, onChange }: NoteEditorProps) {
  return <RichTextEditor content={content} onChange={onChange} />;
}

