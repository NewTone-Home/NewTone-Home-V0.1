import type { ReaderBlock } from '../domain/contracts'

export function ReaderBlockView({ block }: { block: ReaderBlock }) {
  if (block.type === 'scene-cue') return <span className="scene-cue" data-block-id={block.id} aria-hidden="true" />
  if (block.type === 'divider') return <hr data-block-id={block.id} />
  if (block.type === 'quote') return <blockquote data-block-id={block.id}>{block.text}</blockquote>
  if (block.type === 'heading') {
    const Heading = `h${block.level}` as 'h1' | 'h2' | 'h3'
    return <Heading data-block-id={block.id}>{block.text}</Heading>
  }
  return <p data-block-id={block.id}>{block.text}</p>
}
