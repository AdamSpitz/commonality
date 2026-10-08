import { useState, type ReactNode, type DragEvent } from 'react'
import { Box } from '@mui/material'

interface ReorderableListProps {
  /** Stable item ids in current display order. */
  itemIds: string[]
  onReorder: (orderedIds: string[]) => void
  /** Render each row; dragHandleProps should be spread on the drag handle. */
  children: (itemId: string, dragHandleProps: {
    draggable: true
    onDragStart: (e: DragEvent) => void
    onDragEnd: () => void
    'data-drag-handle': true
  }, index: number) => ReactNode
}

/**
 * Lightweight HTML5 drag-and-drop reorder (no extra deps).
 * Drop target is the whole row; drag starts from the handle only via stopPropagation elsewhere.
 */
export function ReorderableList({ itemIds, onReorder, children }: ReorderableListProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const handleDragStart = (id: string) => (e: DragEvent) => {
    setDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }

  const handleDragOver = (id: string) => (e: DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (overId !== id) setOverId(id)
  }

  const handleDrop = (targetId: string) => (e: DragEvent) => {
    e.preventDefault()
    const sourceId = e.dataTransfer.getData('text/plain') || draggingId
    setDraggingId(null)
    setOverId(null)
    if (!sourceId || sourceId === targetId) return
    const from = itemIds.indexOf(sourceId)
    const to = itemIds.indexOf(targetId)
    if (from < 0 || to < 0) return
    const next = itemIds.slice()
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved!)
    onReorder(next)
  }

  const handleDragEnd = () => {
    setDraggingId(null)
    setOverId(null)
  }

  return (
    <Box data-testid="reorderable-list">
      {itemIds.map((id, index) => (
        <Box
          key={id}
          onDragOver={handleDragOver(id)}
          onDrop={handleDrop(id)}
          sx={{
            opacity: draggingId === id ? 0.55 : 1,
            outline: overId === id && draggingId && overId !== draggingId
              ? '2px dashed'
              : 'none',
            outlineColor: 'primary.main',
            borderRadius: 2,
            mb: 1.25,
            transition: 'opacity 0.12s',
          }}
        >
          {children(id, {
            draggable: true,
            onDragStart: handleDragStart(id),
            onDragEnd: handleDragEnd,
            'data-drag-handle': true,
          }, index)}
        </Box>
      ))}
    </Box>
  )
}
