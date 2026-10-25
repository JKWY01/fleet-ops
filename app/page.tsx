import { deployCount24h, fetchFleet } from '@/lib/fleet'

export const revalidate = 120
export const dynamic = 'force-dynamic'

function since(iso: string) {
  const h = Math.round((Date.now() - new Date(iso).getTime()) / 3600000)
  return h < 1 ? '刚刚' : h < 24 ? `${h} 小时前` : `${Math.round(h / 24)} 天前`
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const { key } = await searchParams
  const wantKey = process.env.FLEET_KEY
  if (wantKey && key !== wantKey) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <h1 className="text-xl font-bold">Fleet Ops 🔒</h1>
        <p className="mt-2 text-sm text-ink/60">需要访问密钥。</p>
        <form method="GET" className="mt-4 flex gap-2">
          <input name="key" type="password" placeholder="access key" className="w-full rounded-lg border border-ink/20 bg-card px-3 py-2 text-sm focus:border-brand focus:outline-none" />
          <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-[#0d1117]">进入</button>
        </form>
      </main>
    )
  }

  const [fleet, deploys] = await Promise.all([fetchFleet(), deployCount24h()])
  const q = key ? `?key=${encodeURIComponent(key)}` : ''

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <p className="text-[13px] font-semibold uppercase tracking-widest text-brand">Fleet Ops · {fleet.length} 个资产</p>
      <h1 className="mt-2 text-3xl font-bold">站群驾驶舱</h1>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-ink/15 bg-card p-4">
          <div className="text-[12px] text-ink/50">在线站点</div>
          <div className="mt-1 text-2xl font-bold">{fleet.filter((s) => s.live === 200).length} / {fleet.length}</div>
        </div>
        <div className="rounded-xl border border-ink/15 bg-card p-4">
          <div className="text-[12px] text-ink/50">CI 最近全绿</div>
          <div className="mt-1 text-2xl font-bold">{fleet.filter((s) => s.lastRun?.conclusion === 'success').length} / {fleet.filter((s) => s.lastRun).length}</div>
        </div>
        <div className="rounded-xl border border-ink/15 bg-card p-4">
          <div className="text-[12px] text-ink/50">24h 部署记录</div>
          <div className="mt-1 text-2xl font-bold">{typeof deploys === 'number' ? `${deploys}+` : '—'}</div>
          <div className="text-[11px] text-ink/40">配额 100/天,超限禁部署</div>
        </div>
        <div className="rounded-xl border border-ink/15 bg-card p-4">
          <div className="text-[12px] text-ink/50">内容 URL 总量</div>
          <div className="mt-1 text-2xl font-bold">~75,000</div>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-xl border border-ink/15 bg-card">
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="border-b border-ink/15 text-left text-[12px] uppercase tracking-wider text-ink/45">
              <th className="px-4 py-3">站点</th>
              <th className="px-4 py-3">定位</th>
              <th className="px-4 py-3 text-right">URL</th>
              <th className="px-4 py-3 text-center">在线</th>
              <th className="px-4 py-3">CI 最近运行</th>
              <th className="px-4 py-3 text-right">访客(累计)</th>
              <th className="px-4 py-3 text-right">管理</th>
            </tr>
          </thead>
          <tbody>
            {fleet.map((s) => (
              <tr key={s.site.name} className="border-b border-ink/10 last:border-0">
                <td className="px-4 py-3">
                  <a href={`https://${s.site.domain}`} target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-brand">
                    {s.site.name} ↗
                  </a>
                </td>
                <td className="px-4 py-3 text-ink/60">{s.site.category}</td>
                <td className="px-4 py-3 text-right text-ink/70">{s.site.urls}</td>
                <td className="px-4 py-3 text-center">
                  {s.live === 200 ? <span className="text-emerald-400">● 200</span> : <span className="text-rose-400">● {s.live === 'timeout' ? '超时' : s.live}</span>}
                </td>
                <td className="px-4 py-3 text-ink/70">
                  {s.lastRun ? (
                    <a href={s.lastRun.url} target="_blank" rel="noopener noreferrer" className="hover:text-brand">
                      {s.lastRun.conclusion === 'success' ? '✓' : s.lastRun.conclusion === 'failure' ? '✗' : '…'} {since(s.lastRun.created_at)}
                    </a>
                  ) : (
                    <span className="text-ink/40">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {typeof s.visitors === 'object' ? (
                    <span className="font-semibold">{s.visitors.total}</span>
                  ) : s.visitors === 'not-enabled' ? (
                    <span className="text-amber-400">未开启</span>
                  ) : s.visitors === 'no-token' ? (
                    <span className="text-ink/40">未接 token</span>
                  ) : (
                    <span className="text-ink/40">?</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-[12.5px]">
                  <a className="text-ink/60 hover:text-brand" href={`https://github.com/JKWY01/${s.site.repo}`} target="_blank" rel="noopener noreferrer">GitHub</a>
                  <span className="mx-1 text-ink/30">·</span>
                  <a className="text-ink/60 hover:text-brand" href={`https://vercel.com/dashboard`} target="_blank" rel="noopener noreferrer">Vercel</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-[12px] leading-relaxed text-ink/40">
        数据口径:在线=HEAD 首页 200;CI=GitHub Actions 最近一次运行;访客=Vercel Web Analytics 累计(项目未开启 Analytics 显示"未开启"——在 Vercel 项目 → Storage → Analytics 点一次 Enable 即开始积累);
        IP 级明细 Vercel 不提供(隐私口径),去重访客与页面浏览在 Analytics 后台可见。本页 120 秒自动刷新口径。
        <a className="ml-1 hover:text-brand" href={`/api/fleet${q}`}>JSON 口 →</a>
      </p>
    </main>
  )
}
