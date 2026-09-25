import { describe, expect, it } from 'vitest'
import { accountLinks, eventToolLinks, virusTotalLink } from './toolLinks'

const links = { kibana: 'https://kibana.example.test/', evebox: 'https://evebox.example.test', arkime: 'https://arkime.example.test' }
const event = { srcIp: '198.51.100.7', timestamp: '2026-09-24T12:00:00.000Z', communityId: '1:ab+c/d=' }

describe('eventToolLinks', () => {
  it('pivots on the flow, encoded whole', () => {
    const [evebox, kibana, arkime] = eventToolLinks(event, links)
    expect(evebox.href).toBe('https://evebox.example.test/#/inbox?q=community_id%3A%221%3Aab%2Bc%2Fd%3D%22')
    expect(kibana.href).toContain('https://kibana.example.test/app/discover#/?_g=')
    expect(decodeURIComponent(kibana.href)).toContain("from:'2026-09-24T11:55:00.000Z',to:'2026-09-24T12:05:00.000Z'")
    expect(decodeURIComponent(arkime.href)).toContain('expression=communityId == "1:ab+c/d="')
  })

  it('falls back to the source address', () => {
    const [evebox, , arkime] = eventToolLinks({ ...event, communityId: undefined }, links)
    expect(evebox.href).toBe('https://evebox.example.test/#/inbox?q=198.51.100.7')
    expect(decodeURIComponent(arkime.href)).toContain('expression=ip == 198.51.100.7')
  })

  it('leaves out tools that are not deployed', () => {
    expect(eventToolLinks(event, { evebox: 'https://evebox.example', arkime: 'not a url' })).toEqual([])
  })
})

it('links a file to VirusTotal', () => {
  expect(virusTotalLink('ab12').href).toBe('https://www.virustotal.com/gui/file/ab12')
})

it('builds the account console pages', () => {
  expect(accountLinks('https://sso.example.test/realms/apiary/account')?.security).toBe('https://sso.example.test/realms/apiary/account/#/security/signingin')
  expect(accountLinks(undefined)).toBeUndefined()
})
