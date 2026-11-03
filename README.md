# usage-band

A Claude Code mod that keeps your plan usage in view: a band above the prompt shows how much of your 5-hour and 7-day subscription limits you have used, the time until each resets, and how full the context window is.

```
5h ████░░░░░░ 42% (resets in 2h30)   7d █████████░ 91.5% (resets in 3d 0h)   Context 35%
```

Bars turn yellow at 70% and red at 90%. The figures refresh after each reply; the reset countdowns tick every minute. Type `/usage-band` to hide or show the band.

Limits are reported as percentages only: a Pro or Max plan does not expose a token count left. The band shows nothing for limits on an API key, which has none.

## Install

In the Claude desktop app: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `BerengerBailly/usage-band`, then **Add plugin**.

At the prompt of a terminal session:

```
/plugin install usage-band --marketplace BerengerBailly/usage-band
```

Answer `y` to add the marketplace, then press Enter to install at the user scope.

From a shell:

```
claude plugin install usage-band --marketplace BerengerBailly/usage-band
```
