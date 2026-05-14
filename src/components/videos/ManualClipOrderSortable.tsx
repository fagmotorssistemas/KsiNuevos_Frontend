'use client'

import { useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'

function SortableRow({
  id,
  clipIndex,
  fileName,
  previewUrl,
}: {
  id: string
  clipIndex: number
  fileName: string
  previewUrl: string | undefined
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex gap-2 rounded-xl border border-gray-200 bg-white p-2.5 items-stretch ${
        isDragging ? 'opacity-80 shadow-md ring-2 ring-violet-300 z-10' : ''
      }`}
    >
      <button
        type="button"
        className="shrink-0 self-center p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 cursor-grab active:cursor-grabbing touch-none"
        aria-label="Arrastrar para reordenar"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-5 h-5" />
      </button>
      <div className="w-36 sm:w-40 shrink-0 aspect-video rounded-lg bg-black overflow-hidden border border-gray-200">
        {previewUrl ? (
          <video
            src={previewUrl}
            className="h-full w-full object-cover"
            controls
            playsInline
            preload="metadata"
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
        <span className="text-sm font-semibold text-gray-900">Clip {clipIndex}</span>
        <span className="text-xs text-gray-500 break-all line-clamp-3">{fileName}</span>
      </div>
    </div>
  )
}

export interface ManualClipOrderSortableProps {
  /** Permutación de índices de clip (cada índice aparece una vez). */
  order: number[]
  onOrderChange: (next: number[]) => void
  files: File[]
  previewUrls: string[]
}

export function ManualClipOrderSortable({
  order,
  onOrderChange,
  files,
  previewUrls,
}: ManualClipOrderSortableProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const itemIds = useMemo(() => order.map((i) => String(i)), [order])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = itemIds.indexOf(String(active.id))
    const newIndex = itemIds.indexOf(String(over.id))
    if (oldIndex < 0 || newIndex < 0) return
    onOrderChange(arrayMove(order, oldIndex, newIndex))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {order.map((clipIdx) => (
            <SortableRow
              key={clipIdx}
              id={String(clipIdx)}
              clipIndex={clipIdx}
              fileName={files[clipIdx]?.name ?? `Clip ${clipIdx}`}
              previewUrl={previewUrls[clipIdx]}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
