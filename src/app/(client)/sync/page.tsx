export const dynamic = 'force-dynamic'

import { isBlingConnected } from '@/lib/bling/tokens'
import { SyncClient } from './sync-client'

export default async function SyncPage() {
  const connected = await isBlingConnected()

  return <SyncClient connected={connected} />
}
