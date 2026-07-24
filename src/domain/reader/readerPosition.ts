import type { ReaderPosition } from '../contracts'

export function readerPositionSelector(position: ReaderPosition | null): string | null {
  return position ? `[data-block-id="${CSS.escape(position.blockId)}"]` : null
}
