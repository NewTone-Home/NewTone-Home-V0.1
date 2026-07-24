import { z } from 'zod'

const languageCodeSchema = z.enum(['zh-CN', 'en'])
const localizedTextSchema = z.object({
  'zh-CN': z.string().min(1),
  en: z.string().min(1),
})

export const manifestSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  version: z.string().min(1),
  defaultLanguage: languageCodeSchema,
  languages: z.array(languageCodeSchema).min(1),
  title: localizedTextSchema,
  chapters: z.array(z.object({
    id: z.string().min(1),
    order: z.number().int().nonnegative(),
    title: localizedTextSchema,
    sources: z.record(languageCodeSchema, z.string().min(1)).or(z.object({
      'zh-CN': z.string().optional(),
      en: z.string().optional(),
    })),
  })).min(1),
  world: z.string().min(1),
})

const pointSchema = z.object({ x: z.number(), y: z.number() })

export const worldDefinitionSchema = z.object({
  schemaVersion: z.literal(1),
  surfaceMap: z.string(),
  innerMap: z.string(),
  landmarks: z.array(z.object({
    id: z.string().min(1),
    layer: z.enum(['surface', 'inner']),
    title: localizedTextSchema,
    annotation: localizedTextSchema,
    polygon: z.array(pointSchema).min(3),
    anchor: pointSchema,
    requiredProgressKey: z.string().optional(),
    contentTarget: z.object({
      type: z.enum(['chapter', 'note']),
      id: z.string(),
    }).optional(),
  })),
  progressStates: z.array(z.object({
    key: z.string(),
    from: z.object({ chapterId: z.string(), blockId: z.string() }),
    surfaceVariant: z.string(),
    innerVariant: z.string(),
    unlockedLandmarks: z.array(z.string()),
  })).min(1),
})
