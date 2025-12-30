import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Youtube from '@tiptap/extension-youtube'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import { useEffect, useCallback, useState } from 'react'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Link as LinkIcon,
  Unlink,
  Image as ImageIcon,
  Youtube as YoutubeIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Undo,
  Redo,
} from 'lucide-react'

interface BlockEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  onAutoSave?: (content: string) => void
  autoSaveInterval?: number // in milliseconds
}

export default function BlockEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  onAutoSave,
  autoSaveInterval = 30000, // 30 seconds default
}: BlockEditorProps) {
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [showImageInput, setShowImageInput] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [imageAlt, setImageAlt] = useState('')
  const [showYoutubeInput, setShowYoutubeInput] = useState(false)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [lastSavedContent, setLastSavedContent] = useState(content)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto my-4',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Youtube.configure({
        controls: true,
        nocookie: true,
        HTMLAttributes: {
          class: 'w-full aspect-video rounded-lg my-4',
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({
        multicolor: false,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange(html)
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose max-w-none focus:outline-none min-h-[300px] px-4 py-3',
        style: 'color: var(--text-primary)',
      },
    },
  })

  // Auto-save functionality
  useEffect(() => {
    if (!onAutoSave || !editor) return

    const interval = setInterval(() => {
      const currentContent = editor.getHTML()
      if (currentContent !== lastSavedContent) {
        onAutoSave(currentContent)
        setLastSavedContent(currentContent)
      }
    }, autoSaveInterval)

    return () => clearInterval(interval)
  }, [editor, onAutoSave, autoSaveInterval, lastSavedContent])

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  // Link handling
  const setLink = useCallback(() => {
    if (linkUrl) {
      editor?.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run()
    }
    setShowLinkInput(false)
    setLinkUrl('')
  }, [editor, linkUrl])

  const removeLink = useCallback(() => {
    editor?.chain().focus().extendMarkRange('link').unsetLink().run()
  }, [editor])

  // Image handling
  const addImage = useCallback(() => {
    if (imageUrl) {
      editor?.chain().focus().setImage({ src: imageUrl, alt: imageAlt || 'Image' }).run()
    }
    setShowImageInput(false)
    setImageUrl('')
    setImageAlt('')
  }, [editor, imageUrl, imageAlt])

  // YouTube handling
  const addYoutube = useCallback(() => {
    if (youtubeUrl) {
      editor?.chain().focus().setYoutubeVideo({ src: youtubeUrl }).run()
    }
    setShowYoutubeInput(false)
    setYoutubeUrl('')
  }, [editor, youtubeUrl])

  if (!editor) {
    return null
  }

  return (
    <div
      style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
      className="rounded-lg border overflow-hidden"
    >
      {/* Toolbar */}
      <div
        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
        className="border-b px-2 py-1.5 flex flex-wrap gap-0.5 items-center"
      >
        {/* History */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo size={16} />
        </ToolbarButton>

        <Divider />

        {/* Text formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold (Ctrl+B)"
        >
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic (Ctrl+I)"
        >
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Strikethrough"
        >
          <Strikethrough size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          isActive={editor.isActive('highlight')}
          title="Highlight"
        >
          <Highlighter size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          title="Inline Code"
        >
          <Code size={16} />
        </ToolbarButton>

        <Divider />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <Heading1 size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <Heading2 size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          <Heading3 size={16} />
        </ToolbarButton>

        <Divider />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <ListOrdered size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Quote"
        >
          <Quote size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
        >
          <Minus size={16} />
        </ToolbarButton>

        <Divider />

        {/* Alignment */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
          title="Align Left"
        >
          <AlignLeft size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
          title="Align Center"
        >
          <AlignCenter size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })}
          title="Align Right"
        >
          <AlignRight size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          isActive={editor.isActive({ textAlign: 'justify' })}
          title="Justify"
        >
          <AlignJustify size={16} />
        </ToolbarButton>

        <Divider />

        {/* Links & Media */}
        <ToolbarButton
          onClick={() => setShowLinkInput(!showLinkInput)}
          isActive={editor.isActive('link')}
          title="Add Link"
        >
          <LinkIcon size={16} />
        </ToolbarButton>
        {editor.isActive('link') && (
          <ToolbarButton onClick={removeLink} title="Remove Link">
            <Unlink size={16} />
          </ToolbarButton>
        )}
        <ToolbarButton
          onClick={() => setShowImageInput(!showImageInput)}
          title="Add Image"
        >
          <ImageIcon size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => setShowYoutubeInput(!showYoutubeInput)}
          title="Add YouTube Video"
        >
          <YoutubeIcon size={16} />
        </ToolbarButton>
      </div>

      {/* Link Input */}
      {showLinkInput && (
        <div
          style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}
          className="border-b px-3 py-2 flex gap-2 items-center"
        >
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="Enter URL..."
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
            className="flex-1 px-2 py-1 text-sm rounded border"
            onKeyDown={(e) => e.key === 'Enter' && setLink()}
          />
          <button
            onClick={setLink}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add
          </button>
          <button
            onClick={() => {
              setShowLinkInput(false)
              setLinkUrl('')
            }}
            style={{ color: 'var(--text-muted)' }}
            className="px-2 py-1 text-sm hover:opacity-80"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Image Input */}
      {showImageInput && (
        <div
          style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}
          className="border-b px-3 py-2 flex gap-2 items-center flex-wrap"
        >
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Image URL..."
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
            className="flex-1 min-w-[200px] px-2 py-1 text-sm rounded border"
          />
          <input
            type="text"
            value={imageAlt}
            onChange={(e) => setImageAlt(e.target.value)}
            placeholder="Alt text (optional)"
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
            className="w-40 px-2 py-1 text-sm rounded border"
            onKeyDown={(e) => e.key === 'Enter' && addImage()}
          />
          <button
            onClick={addImage}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add
          </button>
          <button
            onClick={() => {
              setShowImageInput(false)
              setImageUrl('')
              setImageAlt('')
            }}
            style={{ color: 'var(--text-muted)' }}
            className="px-2 py-1 text-sm hover:opacity-80"
          >
            Cancel
          </button>
        </div>
      )}

      {/* YouTube Input */}
      {showYoutubeInput && (
        <div
          style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}
          className="border-b px-3 py-2 flex gap-2 items-center"
        >
          <input
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="YouTube video URL..."
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
            className="flex-1 px-2 py-1 text-sm rounded border"
            onKeyDown={(e) => e.key === 'Enter' && addYoutube()}
          />
          <button
            onClick={addYoutube}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
          >
            Add
          </button>
          <button
            onClick={() => {
              setShowYoutubeInput(false)
              setYoutubeUrl('')
            }}
            style={{ color: 'var(--text-muted)' }}
            className="px-2 py-1 text-sm hover:opacity-80"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Editor Content */}
      <EditorContent editor={editor} />

      {/* Character count */}
      <div
        style={{ color: 'var(--text-muted)', borderColor: 'var(--border-color)' }}
        className="border-t px-3 py-1.5 text-xs flex justify-between"
      >
        <span>{editor.storage.characterCount?.characters?.() || editor.getText().length} characters</span>
        <span>{editor.storage.characterCount?.words?.() || editor.getText().split(/\s+/).filter(Boolean).length} words</span>
      </div>
    </div>
  )
}

// Toolbar Button Component
function ToolbarButton({
  onClick,
  isActive,
  disabled,
  title,
  children,
}: {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        backgroundColor: isActive ? 'var(--bg-tertiary)' : 'transparent',
        color: disabled ? 'var(--text-muted)' : isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
      }}
      className={`p-1.5 rounded hover:opacity-80 transition-colors ${
        disabled ? 'cursor-not-allowed opacity-50' : ''
      }`}
    >
      {children}
    </button>
  )
}

// Divider
function Divider() {
  return (
    <div
      style={{ backgroundColor: 'var(--border-color)' }}
      className="w-px h-5 mx-1"
    />
  )
}
