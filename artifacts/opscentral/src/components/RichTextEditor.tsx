import { useEffect, useState } from 'react';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Undo2,
  Redo2,
  Bold,
  Italic,
  UnderlineIcon,
  Palette,
  Highlighter,
  Image as ImageIcon,
  Minus,
  Link as LinkIcon,
  Table as TableIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Indent,
  Outdent,
  Code2,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { fileToResizedDataUri } from '@/lib/imageUpload';

// A small custom mark, since Tiptap has no built-in "font size" extension --
// this is the standard documented pattern for adding one (a style attribute
// on the shared TextStyle mark).
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return { types: ['textStyle'] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.fontSize || null,
            renderHTML: (attributes: { fontSize?: string | null }) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ chain }: any) =>
          chain().setMark('textStyle', { fontSize: size }).run(),
    } as any;
  },
});

const FONT_FAMILIES = ['Gilroy', 'Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana'];
const FONT_SIZES = ['9pt', '10pt', '11pt', '12pt', '14pt', '16pt', '18pt', '24pt', '32pt'];

function ToolbarButton({ onClick, active, title, children }: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`grid h-8 w-8 place-items-center rounded transition ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const [showSource, setShowSource] = useState(false);
  const [sourceText, setSourceText] = useState(value);
  const [fullscreen, setFullscreen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false }),
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: 'Write the instructions shown to people filling out this form…' }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Keeps the editor in sync if `value` changes from outside (e.g. loading
  // an existing form into the editor after the component's already mounted).
  useEffect(() => {
    if (editor && value !== editor.getHTML()) editor.commands.setContent(value, { emitUpdate: false });
  }, [value, editor]);

  if (!editor) return null;

  const insertImage = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const dataUri = await fileToResizedDataUri(file, 900);
        editor.chain().focus().setImage({ src: dataUri }).run();
      } catch {
        // ignore -- user can just try again
      }
    };
    input.click();
  };

  const insertLink = () => {
    const url = window.prompt('Link URL:', 'https://');
    if (!url) return;
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const toggleSource = () => {
    if (!showSource) setSourceText(editor.getHTML());
    else {
      editor.commands.setContent(sourceText);
      onChange(sourceText);
    }
    setShowSource((s) => !s);
  };

  return (
    <div className={`rounded-lg border border-input ${fullscreen ? 'fixed inset-4 z-50 flex flex-col bg-background shadow-2xl' : ''}`}>
      <div className="flex items-center gap-1 border-b border-border bg-muted/40 px-2 py-1.5">
        <span className="mr-1 text-xs font-bold text-muted-foreground">Edit</span>
      </div>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/20 p-1.5">
        <ToolbarButton title="Undo" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Redo" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>
        <div className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <select
          title="Font family"
          onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
          className="h-8 rounded border border-input bg-background px-1 text-xs"
          defaultValue=""
        >
          <option value="" disabled>
            Font
          </option>
          {FONT_FAMILIES.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <select
          title="Font size"
          onChange={(e) => (editor.commands as any).setFontSize(e.target.value)}
          className="h-8 rounded border border-input bg-background px-1 text-xs"
          defaultValue=""
        >
          <option value="" disabled>
            Size
          </option>
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/20 p-1.5">
        <label title="Text colour" className="grid h-8 w-8 cursor-pointer place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground">
          <Palette className="h-4 w-4" />
          <input type="color" className="h-0 w-0 opacity-0" onChange={(e) => editor.chain().focus().setColor(e.target.value).run()} />
        </label>
        <label title="Highlight" className="grid h-8 w-8 cursor-pointer place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground">
          <Highlighter className="h-4 w-4" />
          <input type="color" className="h-0 w-0 opacity-0" onChange={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()} />
        </label>
        <select
          title="Paragraph style"
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'p') editor.chain().focus().setParagraph().run();
            else editor.chain().focus().toggleHeading({ level: Number(v) as 1 | 2 | 3 }).run();
          }}
          className="h-8 rounded border border-input bg-background px-1 text-xs"
          value={editor.isActive('heading', { level: 1 }) ? '1' : editor.isActive('heading', { level: 2 }) ? '2' : editor.isActive('heading', { level: 3 }) ? '3' : 'p'}
        >
          <option value="p">Paragraph</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
        </select>
        <ToolbarButton title="Insert image" onClick={insertImage}>
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Link" active={editor.isActive('link')} onClick={insertLink}>
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Insert table" onClick={insertTable}>
          <TableIcon className="h-4 w-4" />
        </ToolbarButton>
      </div>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/20 p-1.5">
        <ToolbarButton title="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Align centre" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Align right" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>
        <div className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Decrease indent" onClick={() => editor.chain().focus().liftListItem('listItem').run()}>
          <Outdent className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Increase indent" onClick={() => editor.chain().focus().sinkListItem('listItem').run()}>
          <Indent className="h-4 w-4" />
        </ToolbarButton>
      </div>
      <div className="flex items-center justify-between border-b border-border bg-muted/20 p-1.5">
        <div className="flex items-center gap-0.5">
          <ToolbarButton title="View/edit HTML source" active={showSource} onClick={toggleSource}>
            <Code2 className="h-4 w-4" />
          </ToolbarButton>
        </div>
        <ToolbarButton title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={() => setFullscreen((f) => !f)}>
          {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </ToolbarButton>
      </div>

      {showSource ? (
        <textarea
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          className={`w-full resize-y bg-background p-3 font-mono text-xs outline-none ${fullscreen ? 'flex-1' : 'min-h-[220px]'}`}
        />
      ) : (
        <div className={`overflow-y-auto bg-background ${fullscreen ? 'flex-1' : 'max-h-[400px] min-h-[220px]'}`}>
          <EditorContent editor={editor} className="prose prose-sm max-w-none p-3 focus:outline-none [&_.ProseMirror]:outline-none [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-1.5 [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:p-1.5" />
        </div>
      )}
    </div>
  );
}
