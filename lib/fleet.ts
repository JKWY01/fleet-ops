/** 站群清单与采集器:静态配置 + 请求时拉真数据(GitHub Actions 公开 API、站点存活、
 *  Vercel 部署量/访客(需 VERCEL_TOKEN,未配则如实显示"未接")。
 *  纪律同全站群:数字要么真、要么明示缺失。 */

export interface FleetSite {
  name: string
  repo: string
  domain: string
  /** 内容页量级(建站时统计的约数,标注口径) */
  urls: string
  category: string
  /** vercel 项目名(默认与 name 同) */
  vercel?: string
  workflow?: string
}

export const FLEET: FleetSite[] = [
  { name: 'AnswerToday', repo: 'answertoday', domain: 'answertoday.vercel.app', urls: '~3,360', category: '每日答案(Wordle+Connections)', workflow: 'sync.yml' },
  { name: 'VerTrack', repo: 'vertrack', domain: 'vertrack-three.vercel.app', urls: '~15,660', category: 'npm+PyPI 包版本追踪', workflow: 'sync.yml' },
  { name: 'WageStats', repo: 'wagestats', domain: 'wagestats.vercel.app', urls: '~45,900', category: 'BLS 薪资矩阵', workflow: 'sync.yml' },
  { name: 'NutriStats', repo: 'nutristats', domain: 'nutristats-dusky.vercel.app', urls: '~7,830', category: 'USDA 营养库', workflow: 'sync.yml' },
  { name: 'ExtStats', repo: 'extstats', domain: 'extstats.vercel.app', urls: '~2,030', category: 'VS Code 插件数据', workflow: 'sync.yml' },
  { name: 'SizeCharts', repo: 'sizecharts', domain: 'sizecharts-ivory.vercel.app', urls: '~130', category: '尺码换算', workflow: 'healthcheck.yml' },
  { name: 'DockerStats', repo: 'dockerstats', domain: 'dockerstats.vercel.app', urls: '~150', category: 'Docker 官方镜像', workflow: 'sync.yml' },
  { name: 'SalaryAtlas', repo: '(并行会话)', domain: 'salary-atlas.vercel.app', urls: '?', category: 'BLS 薪资(metro 长尾,撞车待定)', workflow: '-' },
  { name: 'GitHub 火线榜', repo: 'github-hot-board', domain: 'git.vaiox.xyz', urls: '16 语 × 全榜', category: 'GitHub 榜单旗舰(自托管)', workflow: 'sync.yml' },
]

export interface SiteStatus {
  site: FleetSite
  live: number | 'timeout'
  lastRun: { name: string; status: string; conclusion: string | null; created_at: string; url: string } | null
  visitors: { total: number } | 'not-enabled' | 'no-token' | 'error'
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | 'timeout'> {
  return Promise.race([p, new Promise<T | 'timeout'>((r) => setTimeout(() => r('timeout'), ms))])
}

export async function fetchFleet(): Promise<SiteStatus[]> {
  const token = process.env.VERCEL_TOKEN
  const team = process.env.VERCEL_TEAM

  return Promise.all(
    FLEET.map(async (site) => {
      const [live, run, visitors] = await Promise.all([
        withTimeout(
          fetch(`https://${site.domain}/`, { method: 'HEAD', signal: AbortSignal.timeout(8000) })
            .then((r) => r.status)
            .catch(() => 0),
          9000,
        ),
        site.repo.includes('/') || site.repo === '(并行会话)'
          ? Promise.resolve(null)
          : withTimeout(
              fetch(`https://api.github.com/repos/JKWY01/${site.repo}/actions/runs?per_page=1`, {
                headers: { 'User-Agent': 'fleet-ops', Accept: 'application/vnd.github+json' },
                signal: AbortSignal.timeout(8000),
              })
                .then((r) => r.json())
                .then((j) => {
                  const run = j.workflow_runs?.[0]
                  return run
                    ? { name: run.name, status: run.status, conclusion: run.conclusion, created_at: run.created_at, url: run.html_url }
                    : null
                })
                .catch(() => null),
              9000,
            ),
        (async () => {
          if (!token || !team) return 'no-token' as const
          try {
            const pr = await fetch(`https://api.vercel.com/v9/projects?limit=100&teamId=${team}`, {
              headers: { Authorization: `Bearer ${token}` },
              signal: AbortSignal.timeout(8000),
            }).then((r) => r.json())
            const pid = (pr.projects ?? []).find((p: { name: string }) => p.name === (site.vercel ?? site.repo))?.id
            if (!pid) return 'error' as const
            const v = await fetch(`https://api.vercel.com/v1/web-analytics/${pid}/visitors?teamId=${team}`, {
              headers: { Authorization: `Bearer ${token}` },
              signal: AbortSignal.timeout(8000),
            })
            if (v.status === 404) return 'not-enabled' as const
            if (!v.ok) return 'error' as const
            const j = await v.json()
            return { total: (j.visitors ?? []).reduce((s: number, x: { count: number }) => s + x.count, 0) }
          } catch {
            return 'error' as const
          }
        })(),
      ])

      return { site, live, lastRun: run as SiteStatus['lastRun'], visitors }
    }),
  )
}

export async function deployCount24h(): Promise<number | 'no-token' | 'error'> {
  const token = process.env.VERCEL_TOKEN
  const team = process.env.VERCEL_TEAM
  if (!token || !team) return 'no-token'
  try {
    const since = Date.now() - 86400_000
    const j = await fetch(`https://api.vercel.com/v6/deployments?limit=100&since=${since}&teamId=${team}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    }).then((r) => r.json())
    return j.deployments?.length ?? 0
  } catch {
    return 'error'
  }
}
