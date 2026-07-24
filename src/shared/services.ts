import { IndexedDbContentAdapter } from '../adapters/content/IndexedDbContentAdapter'
import { BrowserSaveAdapter } from '../adapters/save/BrowserSaveAdapter'

export const contentPort = new IndexedDbContentAdapter()
export const savePort = new BrowserSaveAdapter()
