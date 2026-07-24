import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import type { CenterViewState, WorldDefinition, WorldState } from '../../domain/contracts'
import type { CenterBridge } from './CenterBridge'
import { CenterScene } from './CenterScene'

interface Props {
  bridge: CenterBridge
  definition: WorldDefinition
  worldState: WorldState
  viewState: CenterViewState
}

export function CenterGameHost({ bridge, definition, worldState, viewState }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const initialWorld = useRef(worldState)
  const initialView = useRef(viewState)

  useEffect(() => {
    if (!hostRef.current) return
    const host = hostRef.current
    host.replaceChildren()
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host,
      width: host.clientWidth,
      height: host.clientHeight,
      transparent: true,
      render: { antialias: true, roundPixels: false },
      scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: [],
      callbacks: {
        postBoot: (instance) => {
          instance.scene.add('center-world', CenterScene, true, {
            bridge,
            definition,
            initialWorld: initialWorld.current,
            initialView: initialView.current,
          })
        },
      },
    })
    return () => {
      game.destroy(true)
      host.replaceChildren()
    }
  }, [bridge, definition])

  return <div className="center-canvas" ref={hostRef} data-testid="center-canvas" />
}
