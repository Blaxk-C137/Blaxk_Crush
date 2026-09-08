const LS_UUID_KEY = 'cb_visitor_uuid'
const TOS_KEY = 'tos_v1'

export function getOrCreateVisitorUUID(): string {
  let uuid = localStorage.getItem(LS_UUID_KEY)
  if (!uuid) {
    uuid = crypto.randomUUID()
    localStorage.setItem(LS_UUID_KEY, uuid)
  }
  return uuid
}

export function hasTosAccepted(): boolean {
  return !!localStorage.getItem(TOS_KEY)
}

export function setTosAccepted(): void {
  localStorage.setItem(TOS_KEY, new Date().toISOString())
}
