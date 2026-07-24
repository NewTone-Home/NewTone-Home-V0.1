import Phaser from 'phaser'
import type { CenterViewState, LandmarkDefinition, WorldDefinition, WorldLayer, WorldState } from '../../domain/contracts'
import { clampExpansion } from '../../domain/world/worldResolver'
import { resolveCenterAsset } from '../world/assets'
import type { CenterBridge } from './CenterBridge'
import { clampCameraScroll, projectWorldPoint } from '../camera/cameraMath'

interface SceneData {
  bridge: CenterBridge
  definition: WorldDefinition
  initialWorld: WorldState
  initialView: CenterViewState
}

const WORLD_WIDTH = 1200
const WORLD_HEIGHT = 800
const GLOW_BASE_ALPHA = 0.14
const GLOW_FOCUS_MS = 760

export class CenterScene extends Phaser.Scene {
  private bridge!: CenterBridge
  private definition!: WorldDefinition
  private worldState!: WorldState
  private viewState!: CenterViewState
  private surfaceContainer!: Phaser.GameObjects.Container
  private innerContainer!: Phaser.GameObjects.Container
  private landmarkViews = new Map<string, { shape: Phaser.GameObjects.Polygon; glow: Phaser.GameObjects.Graphics }>()
  private dragging = false
  private lastPointer = new Phaser.Math.Vector2()
  private hoveredLandmarkId: string | null = null
  private cleanup: Array<() => void> = []

  constructor() {
    super('center-world')
  }

  init(data: SceneData) {
    this.bridge = data.bridge
    this.definition = data.definition
    this.worldState = data.initialWorld
    this.viewState = data.initialView
  }

  preload() {
    const surfaceMapUrl = resolveCenterAsset(this.definition.surfaceMap)
    if (surfaceMapUrl) this.load.image(this.definition.surfaceMap, surfaceMapUrl)
  }

  create() {
    try {
      this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
      this.cameras.main.setBackgroundColor('#171b18')
      this.surfaceContainer = this.add.container(0, 0)
      this.innerContainer = this.add.container(0, 0)
      this.drawWorldLayer('inner', this.innerContainer)
      this.drawWorldLayer('surface', this.surfaceContainer)
      this.createLandmarks()
      this.applyWorldState()
      this.applyViewState()
      this.fitCamera()
      this.bindInput()
      this.cleanup.push(this.bridge.subscribeWorld((snapshot) => {
        this.worldState = snapshot
        this.applyWorldState()
      }))
      this.cleanup.push(this.bridge.subscribeView((snapshot) => {
        this.viewState = { ...snapshot, expansion: clampExpansion(snapshot.expansion) }
        this.applyViewState()
      }))
      this.scale.on('resize', this.onResize, this)
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.dispose, this)
      this.bridge.emit({ type: 'runtime/ready' })
      this.emitProjection()
    } catch (error) {
      this.bridge.emit({ type: 'runtime/error', message: error instanceof Error ? error.message : 'Center 启动失败' })
    }
  }

  private drawWorldLayer(layer: WorldLayer, container: Phaser.GameObjects.Container) {
    const isSurface = layer === 'surface'
    const assetKey = isSurface ? this.definition.surfaceMap : this.definition.innerMap
    if (isSurface && this.textures.exists(assetKey)) {
      const map = this.add.image(0, 0, assetKey)
        .setOrigin(0, 0)
        .setDisplaySize(WORLD_WIDTH, WORLD_HEIGHT)
      container.add(map)
      container.setData('assetKey', assetKey)
      return
    }

    const graphics = this.add.graphics()
    graphics.fillStyle(isSurface ? 0xc8b993 : 0x273d3c, 1)
    graphics.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
    graphics.lineStyle(2, isSurface ? 0x766647 : 0x91a69a, 0.42)
    for (let i = 0; i < 16; i += 1) {
      const y = 64 + i * 38 + Math.sin(i * 1.7) * 16
      graphics.beginPath()
      graphics.moveTo(0, y)
      for (let x = 0; x <= WORLD_WIDTH; x += 60) {
        graphics.lineTo(x, y + Math.sin(x / 110 + i) * (isSurface ? 18 : 28))
      }
      graphics.strokePath()
    }
    graphics.lineStyle(isSurface ? 9 : 6, isSurface ? 0xe7dbc0 : 0x77949a, 0.58)
    graphics.beginPath()
    for (let x = -30; x <= 1230; x += 35) {
      const t = (x + 30) / 1260
      const base = isSurface ? 555 : 170
      const y = base + Math.sin(t * Math.PI * 2.2) * 95 + t * (isSurface ? -45 : 105)
      if (x === -30) graphics.moveTo(x, y)
      else graphics.lineTo(x, y)
    }
    graphics.strokePath()
    graphics.lineStyle(1, isSurface ? 0x5c4d38 : 0xb4cac0, 0.7)
    const seed = isSurface ? 29 : 53
    for (let i = 0; i < 55; i += 1) {
      const x = (i * 97 + seed * 11) % WORLD_WIDTH
      const y = (i * 61 + seed * 7) % WORLD_HEIGHT
      graphics.strokeCircle(x, y, 2 + (i % 4))
    }
    container.add(graphics)
    container.setData('assetKey', assetKey)
  }

  private createLandmarks() {
    for (const landmark of this.definition.landmarks) {
      const container = landmark.layer === 'surface' ? this.surfaceContainer : this.innerContainer
      const flatPoints = landmark.polygon.flatMap((point) => [point.x, point.y])
      const glow = this.add.graphics()
      glow.fillStyle(landmark.layer === 'surface' ? 0xffe1a3 : 0xa7ecdd, 0.16)
      glow.fillPoints(landmark.polygon.map((point) => new Phaser.Geom.Point(point.x, point.y)), true)
      glow.lineStyle(2, landmark.layer === 'surface' ? 0xf9d286 : 0x8cd8c9, 0.7)
      glow.strokePoints(landmark.polygon.map((point) => new Phaser.Geom.Point(point.x, point.y)), true)
      const shape = this.add.polygon(0, 0, flatPoints, 0xffffff, 0.001)
      shape.setOrigin(0, 0)
      // 轮廓默认极弱(可辨认但不喧宾夺主),悬停约 760ms 内逐渐发光 —— 对应 V0.0
      // "地标不常驻卡片 · 悬停后轮廓逐渐发光"。
      glow.setAlpha(GLOW_BASE_ALPHA)
      container.add([glow, shape])
      this.landmarkViews.set(landmark.id, { shape, glow })
    }
  }

  // 悬停驱动的轮廓发光:命中的地标在 ~760ms 内渐亮并转入轻微呼吸,其余回落到基线。
  private setLandmarkGlow(focusId: string | null) {
    for (const [id, view] of this.landmarkViews) {
      const unlocked = this.worldState.unlockedLandmarkIds.includes(id)
      this.tweens.killTweensOf(view.glow)
      if (focusId === id && unlocked) {
        this.tweens.add({
          targets: view.glow,
          alpha: { from: view.glow.alpha, to: 1 },
          duration: GLOW_FOCUS_MS,
          ease: 'Sine.Out',
          onComplete: () => {
            this.tweens.add({
              targets: view.glow,
              alpha: { from: 1, to: 0.7 },
              duration: 1400,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.InOut',
            })
          },
        })
      } else {
        this.tweens.add({
          targets: view.glow,
          alpha: { from: view.glow.alpha, to: GLOW_BASE_ALPHA },
          duration: 240,
          ease: 'Sine.Out',
        })
      }
    }
  }

  private applyWorldState() {
    // 只做解锁可见性;发光交给 setLandmarkGlow 的悬停驱动(不再全体常亮脉冲)。
    for (const [id, view] of this.landmarkViews) {
      const unlocked = this.worldState.unlockedLandmarkIds.includes(id)
      view.shape.setVisible(unlocked)
      view.glow.setVisible(unlocked)
      if (unlocked && id !== this.hoveredLandmarkId) {
        this.tweens.killTweensOf(view.glow)
        view.glow.setAlpha(GLOW_BASE_ALPHA)
      }
    }
  }

  private applyViewState() {
    const layerScaleY = 1 - this.viewState.expansion * 0.5
    const innerOffsetY = this.viewState.expansion * (WORLD_HEIGHT / 2)
    this.surfaceContainer.setPosition(0, 0).setScale(1, layerScaleY)
    this.innerContainer.setPosition(0, innerOffsetY).setScale(1, layerScaleY)
    this.surfaceContainer.setAlpha(1)
    this.innerContainer.setAlpha(0.14 + this.viewState.expansion * 0.86)
    if (this.viewState.activeLayer === 'surface') this.innerContainer.setAlpha(0.08)
    if (this.viewState.activeLayer === 'inner') this.surfaceContainer.setAlpha(0.1)
    this.emitProjection()
  }

  private bindInput() {
    this.input.mouse?.disableContextMenu()
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        this.dragging = true
        this.lastPointer.set(pointer.x, pointer.y)
        if (this.hoveredLandmarkId !== null) {
          this.hoveredLandmarkId = null
          this.setLandmarkGlow(null)
          this.bridge.emit({ type: 'landmark/hover', landmarkId: null })
        }
        return
      }
      const landmark = this.findLandmarkAt(pointer)
      if (landmark) this.bridge.emit({ type: 'landmark/open', landmarkId: landmark.id })
    })
    this.input.on('pointerup', () => { this.dragging = false })
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.dragging) {
        const landmarkId = this.findLandmarkAt(pointer)?.id ?? null
        if (landmarkId !== this.hoveredLandmarkId) {
          this.hoveredLandmarkId = landmarkId
          this.setLandmarkGlow(landmarkId)
          this.bridge.emit({ type: 'landmark/hover', landmarkId })
        }
        return
      }
      const camera = this.cameras.main
      const dx = (pointer.x - this.lastPointer.x) / camera.zoom
      const dy = (pointer.y - this.lastPointer.y) / camera.zoom
      this.lastPointer.set(pointer.x, pointer.y)
      this.setCameraScroll(camera.scrollX - dx, camera.scrollY - dy)
    })
    this.input.on('wheel', (pointer: Phaser.Input.Pointer, _objects: unknown, _dx: number, dy: number) => {
      const camera = this.cameras.main
      const before = camera.getWorldPoint(pointer.x, pointer.y)
      camera.setZoom(Phaser.Math.Clamp(camera.zoom * Math.exp(-dy * 0.0015), 0.65, 2.4))
      const after = camera.getWorldPoint(pointer.x, pointer.y)
      this.setCameraScroll(camera.scrollX + before.x - after.x, camera.scrollY + before.y - after.y)
    })
  }

  private findLandmarkAt(pointer: Phaser.Input.Pointer): LandmarkDefinition | null {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
    const layerScaleY = 1 - this.viewState.expansion * 0.5
    const innerOffsetY = this.viewState.expansion * (WORLD_HEIGHT / 2)
    const ordered = [...this.definition.landmarks].reverse()
    for (const landmark of ordered) {
      if (!this.worldState.unlockedLandmarkIds.includes(landmark.id)) continue
      if (this.viewState.activeLayer && this.viewState.activeLayer !== landmark.layer) continue
      const localY = (worldPoint.y - (landmark.layer === 'inner' ? innerOffsetY : 0)) / layerScaleY
      const polygon = new Phaser.Geom.Polygon(landmark.polygon)
      if (Phaser.Geom.Polygon.Contains(polygon, worldPoint.x, localY)) return landmark
    }
    return null
  }

  private fitCamera() {
    const camera = this.cameras.main
    const zoom = Math.max(camera.width / WORLD_WIDTH, camera.height / WORLD_HEIGHT)
    camera.setZoom(zoom)
    // 显式按 zoom 折算居中:此 Phaser 构建的 centerOn 未按 zoom 折算,会把世界推出屏外
    // (旧"进入 Center 全黑"的根因)。手动把世界中心对到视口中心。
    camera.setScroll(
      WORLD_WIDTH / 2 - (camera.width / 2) / zoom,
      WORLD_HEIGHT / 2 - (camera.height / 2) / zoom,
    )
    this.emitCamera()
  }

  private setCameraScroll(x: number, y: number) {
    const camera = this.cameras.main
    const clamped = clampCameraScroll(x, y, {
      scrollX: camera.scrollX,
      scrollY: camera.scrollY,
      zoom: camera.zoom,
      width: camera.width,
      height: camera.height,
    }, WORLD_WIDTH, WORLD_HEIGHT)
    camera.setScroll(clamped.x, clamped.y)
    this.emitCamera()
  }

  private emitCamera() {
    const camera = this.cameras.main
    this.bridge.emit({
      type: 'camera/change',
      camera: { scrollX: camera.scrollX, scrollY: camera.scrollY, zoom: camera.zoom },
    })
    this.emitProjection()
  }

  private emitProjection() {
    if (!this.cameras?.main || !this.definition) return
    const camera = this.cameras.main
    const layerScaleY = 1 - this.viewState.expansion * 0.5
    const innerOffsetY = this.viewState.expansion * (WORLD_HEIGHT / 2)
    const anchors = Object.fromEntries(this.definition.landmarks.map((landmark: LandmarkDefinition) => {
      return [landmark.id, projectWorldPoint(
        {
          x: landmark.anchor.x,
          y: landmark.anchor.y * layerScaleY + (landmark.layer === 'inner' ? innerOffsetY : 0),
        },
        camera,
      )]
    }))
    this.bridge.emit({ type: 'projection/update', anchors })
  }

  private onResize(gameSize: Phaser.Structs.Size) {
    this.cameras.main.setSize(gameSize.width, gameSize.height)
    this.fitCamera()
  }

  private dispose() {
    this.scale.off('resize', this.onResize, this)
    this.cleanup.forEach((cleanup) => cleanup())
    this.cleanup = []
  }
}
