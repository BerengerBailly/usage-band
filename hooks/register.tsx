import { atom, read, update } from 'claude-code'
import type { Register, SessionMeasureInput } from 'claude-code'

import type { Usage } from '../types'

const usage = atom({ plugin: 'usage-band', key: 'usage' } as const, null, {
  shape: 'usage-1',
})
const now = atom({ plugin: 'usage-band', key: 'now' } as const, 0)
const isHidden = atom({ plugin: 'usage-band', key: 'isHidden' } as const, false)

const LABELS: Record<string, string> = {
  five_hour: '5h',
  seven_day: '7d',
  spend_limit: 'Spend',
}

function toUsage(m: Pick<SessionMeasureInput, 'context' | 'rateLimits'>): Usage {
  return {
    windows: m.rateLimits.map(w => ({ ...w })),
    contextPercent: m.context.percent,
  }
}

function untilReset(resetsAt: string | undefined, at: number) {
  const ms = resetsAt ? Date.parse(resetsAt) - at : NaN
  if (!(ms > 0)) {
    return ''
  }
  const minutes = Math.ceil(ms / 60000)
  if (minutes < 60) {
    return ` (resets in ${minutes}m)`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return ` (resets in ${hours}h${String(minutes % 60).padStart(2, '0')})`
  }

  return ` (resets in ${Math.floor(hours / 24)}d ${hours % 24}h)`
}

function colorFor(percent: number) {
  return percent >= 90 ? 'error' : percent >= 70 ? 'warning' : 'success'
}

function bar(percent: number) {
  const filled = Math.round(Math.min(100, Math.max(0, percent)) / 10)

  return '█'.repeat(filled) + '░'.repeat(10 - filled)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'usage-band',
      description: 'Show or hide the plan usage band above the prompt',
    })
    const first = await $.session.usage()
    const at = await $.clock.now()
    await update($, usage, () => toUsage(first))
    await update($, now, () => at)

    // Keeps the reset countdowns current between replies.
    $.clock.every(60_000, () => {
      void $.clock.now().then(t => update($, now, () => t))
    })

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    const at = await $.clock.now()
    await update($, usage, () => toUsage(e))
    await update($, now, () => at)

    return next(e)
  })

  on('command.run', { command: 'usage-band' }, async $ => {
    const wasHidden = await read($, isHidden)
    await update($, isHidden, () => !wasHidden)

    return { text: wasHidden ? 'Usage band shown.' : 'Usage band hidden.' }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const current = await read($, usage)
    if (e.props.hasSurvey || (await read($, isHidden))) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)
    const at = await read($, now)
    const windows = current?.windows ?? []

    return (
      <Box flexDirection="row" flexWrap="wrap" columnGap={2}>
        {windows.length === 0 && (
          <Text dimColor>Plan usage shows after the next reply</Text>
        )}
        {windows.map(w => (
          <Text>
            <Text dimColor>{LABELS[w.kind] ?? w.kind} </Text>
            <Text color={colorFor(w.percentUsed)}>{bar(w.percentUsed)} </Text>
            <Text weight="semibold">{w.percentUsed}%</Text>
            <Text dimColor>{untilReset(w.resetsAt, at)}</Text>
          </Text>
        ))}
        {current?.contextPercent !== undefined && (
          <Text dimColor>Context {current.contextPercent}%</Text>
        )}
      </Box>
    )
  })
}
