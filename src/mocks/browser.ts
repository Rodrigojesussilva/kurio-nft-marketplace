import { setupWorker } from 'msw/browser'
import { handlers, socketHandler } from './handlers'
export const worker = setupWorker(...handlers, socketHandler)
