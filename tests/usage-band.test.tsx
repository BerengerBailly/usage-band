import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'usage-band',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

const START = Date.parse('2026-11-03T10:00:00Z')

test('the band waits for a reading, then shows each window and counts down', async ($, on) => {
  const clock = mock.clock(on, { now: START })
  on('command.register', () => ({ value: { command: 'usage-band' } }))
  on('session.usage', () => ({
    value: { startedAt: START, context: { window: 200000 }, rateLimits: [] },
  }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.measure', (_, e) => ({ changed: e.changed }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /next reply/ }))?.text).toBe(
    'Plan usage shows after the next reply',
  )

  await $.session.measure({
    context: { window: 200000, tokens: 70000, percent: 35 },
    rateLimits: [
      { kind: 'five_hour', percentUsed: 42, resetsAt: '2026-11-03T12:30:00Z' },
      { kind: 'seven_day', percentUsed: 91.5, resetsAt: '2026-11-06T10:00:00Z' },
    ],
    changed: ['context', 'rateLimits'],
  })
  const fiveHour = await ui.find({ type: 'Text', text: /^5h/ })
  expect(fiveHour?.text).toBe('5h ████░░░░░░ 42% (resets in 2h30)')
  const sevenDay = await ui.find({ type: 'Text', text: /^7d/ })
  expect(sevenDay?.text).toBe('7d █████████░ 91.5% (resets in 3d 0h)')
  expect((await ui.find({ type: 'Text', text: /Context/ }))?.text).toBe('Context 35%')

  await clock.advance(31 * 60_000)
  expect((await ui.find({ type: 'Text', text: /^5h/ }))?.text).toBe(
    '5h ████░░░░░░ 42% (resets in 1h59)',
  )
  await ui.unmount()
})

test('the command hides and shows the band', async ($, on) => {
  on('command.run', () => ({ text: '' }))
  const hidden = await $.command.run({ command: 'usage-band', args: '' })
  expect(hidden?.text).toBe('Usage band hidden.')
  const shown = await $.command.run({ command: 'usage-band', args: '' })
  expect(shown?.text).toBe('Usage band shown.')
})
