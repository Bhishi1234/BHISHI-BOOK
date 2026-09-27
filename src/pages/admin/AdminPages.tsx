import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AdminBars,
  AdminShell,
  AdminStats,
  money,
  OwnerState,
  useAdminReport,
  when,
} from "./AdminShell";

type CountRow = { label: string; count: number; amount?: number; payout?: number };
type DayRow = { day: string; count: number };

function qMatch(q: string, parts: Array<string | number | null | undefined>) {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return parts.some((part) => String(part ?? "").toLowerCase().includes(needle));
}

function Search({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      className="field owner-search"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function AdminOverviewPage() {
  const { data, error } = useAdminReport<{
    organisers: number;
    organisersToday: number;
    organisersMonth: number;
    deactivated: number;
    bhishis: number;
    running: number;
    completed: number;
    cancelled: number;
    createdToday: number;
    createdMonth: number;
    potRunning: number;
    monthlyBook: number;
    hands: number;
    people: number;
    collectedAll: number;
    collectedToday: number;
    collectedMonth: number;
    awards: number;
    payoutAll: number;
    openTickets: number;
    visitsToday: number;
    visitsMonth: number;
  }>("overview");

  return (
    <AdminShell title="Overview" hint="India time · books only, the platform does not hold the money">
      <OwnerState error={error} ready={Boolean(data)} />
      {data && (
        <>
          <AdminStats items={[
            { label: "Organisers", value: String(data.organisers), hint: `${data.organisersToday} today · ${data.organisersMonth} this month` },
            { label: "Bhishi groups", value: String(data.bhishis), hint: `${data.running} running · ${data.completed} completed · ${data.cancelled} cancelled` },
            { label: "Running pot", value: money(data.potRunning), hint: `${money(data.monthlyBook)} instalment book / round` },
            { label: "Recorded collections", value: money(data.collectedAll), hint: `${money(data.collectedToday)} today · ${money(data.collectedMonth)} this month` },
            { label: "People on books", value: String(data.people), hint: `${data.hands} hands across groups` },
            { label: "Awards", value: String(data.awards), hint: `${money(data.payoutAll)} prize recorded` },
            { label: "Landing visits", value: String(data.visitsToday), hint: `${data.visitsMonth} this month` },
            { label: "Open support", value: String(data.openTickets), hint: `${data.deactivated} deactivated accounts` },
          ]} />
          <div className="owner-links">
            <Link to="/AdminBhishi">Groups created today: {data.createdToday}</Link>
            <Link to="/memberBhishi">Member money and prizes</Link>
            <Link to="/WebsiteMetrics">Signups this month: {data.organisersMonth}</Link>
            <Link to="/AdminCollections">Collections</Link>
            <Link to="/AdminAwards">Awards</Link>
            <Link to="/AdminOrganisers">Organisers</Link>
          </div>
        </>
      )}
    </AdminShell>
  );
}

type BhishiRow = {
  id: string;
  name: string;
  type: string;
  status: string;
  mode: string;
  frequency: string;
  pot: number;
  instalment: number;
  members_count: number;
  duration: number;
  current_cycle: number;
  start_date: string;
  member_visible: boolean;
  created_at: string;
  owner_name: string;
  owner_phone: string;
};

export function AdminBhishiPage() {
  const { data, error } = useAdminReport<{
    byStatus: CountRow[];
    byType: CountRow[];
    byMode: CountRow[];
    byFrequency: CountRow[];
    rows: BhishiRow[];
  }>("bhishis");
  const [q, setQ] = useState("");
  const rows = useMemo(
    () => (data?.rows || []).filter((row) => qMatch(q, [row.name, row.type, row.status, row.mode, row.owner_name, row.owner_phone])),
    [data, q],
  );

  return (
    <AdminShell title="Bhishi groups" hint="Every group on the platform, who created it, and where it stands">
      <OwnerState error={error} ready={Boolean(data)} />
      {data && (
        <>
          <div className="owner-split">
            <section><h2>Status</h2><AdminBars rows={data.byStatus} /></section>
            <section><h2>Type</h2><AdminBars rows={data.byType} /></section>
            <section><h2>Mode</h2><AdminBars rows={data.byMode} /></section>
            <section><h2>Frequency</h2><AdminBars rows={data.byFrequency} /></section>
          </div>
          <Search value={q} onChange={setQ} placeholder="Search name, owner, phone, type" />
          <div className="owner-table-wrap">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Group</th>
                  <th>Owner</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Pot</th>
                  <th>Hapta</th>
                  <th>Round</th>
                  <th>Hands</th>
                  <th>Shared</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td><strong>{row.name}</strong><span>{row.frequency} · starts {String(row.start_date).slice(0, 10)}</span></td>
                    <td>{row.owner_name}<span>{row.owner_phone || "No phone"}</span></td>
                    <td>{when(row.created_at)}</td>
                    <td>{row.status}</td>
                    <td>{row.type}<span>{row.mode}</span></td>
                    <td>{money(row.pot)}</td>
                    <td>{money(row.instalment)}</td>
                    <td>{row.current_cycle} / {row.duration}</td>
                    <td>{row.members_count}</td>
                    <td>{row.member_visible ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <p className="owner-empty">No groups match.</p>}
          </div>
        </>
      )}
    </AdminShell>
  );
}

type MemberRow = {
  phone: string;
  name: string;
  groups: number;
  running_groups: number;
  monthly_due: number;
  still_to_pay: number;
  unprized_hands: number;
  unprized_pot: number;
  organiser_count: number;
  organisers: string;
  paid: number;
  wins: number;
  won_amount: number;
};

export function AdminMembersPage() {
  const { data, error } = useAdminReport<{ rows: MemberRow[] }>("members");
  const [q, setQ] = useState("");
  const rows = useMemo(
    () => (data?.rows || []).filter((row) => qMatch(q, [row.name, row.phone, row.organisers])),
    [data, q],
  );
  const totals = useMemo(() => rows.reduce((sum, row) => ({
    monthly: sum.monthly + Number(row.monthly_due || 0),
    paid: sum.paid + Number(row.paid || 0),
    won: sum.won + Number(row.won_amount || 0),
  }), { monthly: 0, paid: 0, won: 0 }), [rows]);

  return (
    <AdminShell title="Members" hint="One row per phone number. Money figures are what organisers recorded, not funds we hold.">
      <OwnerState error={error} ready={Boolean(data)} />
      {data && (
        <>
          <AdminStats items={[
            { label: "People", value: String(rows.length) },
            { label: "Monthly hapta", value: money(totals.monthly), hint: "Sum of running instalments" },
            { label: "Recorded paid", value: money(totals.paid) },
            { label: "Prizes recorded", value: money(totals.won) },
          ]} />
          <Search value={q} onChange={setQ} placeholder="Search name, phone, organiser" />
          <div className="owner-table-wrap">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Phone</th>
                  <th>Groups</th>
                  <th>Running</th>
                  <th>Monthly hapta</th>
                  <th>Still to pay</th>
                  <th>Paid so far</th>
                  <th>Wins</th>
                  <th>Prize recorded</th>
                  <th>Unprized hands</th>
                  <th>Unprized pot</th>
                  <th>Organisers</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.phone || row.name}>
                    <td><strong>{row.name || "Member"}</strong></td>
                    <td>{row.phone}</td>
                    <td>{row.groups}</td>
                    <td>{row.running_groups}</td>
                    <td>{money(row.monthly_due)}</td>
                    <td>{money(row.still_to_pay)}</td>
                    <td>{money(row.paid)}</td>
                    <td>{row.wins}</td>
                    <td>{money(row.won_amount)}</td>
                    <td>{row.unprized_hands}</td>
                    <td>{money(row.unprized_pot)}</td>
                    <td>{row.organisers || "—"}<span>{row.organiser_count} account{row.organiser_count === 1 ? "" : "s"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <p className="owner-empty">No members match.</p>}
          </div>
        </>
      )}
    </AdminShell>
  );
}

export function AdminWebsitePage() {
  const { data, error } = useAdminReport<{
    signupsAll: number;
    signupsToday: number;
    signupsWeek: number;
    signupsMonth: number;
    deactivated: number;
    activeAccounts: number;
    visitsAll: number;
    visitsToday: number;
    visitsWeek: number;
    visitsMonth: number;
    groupsToday: number;
    groupsMonth: number;
    paymentsToday: number;
    paymentsMonth: number;
    languages: CountRow[];
    signupsByDay: DayRow[];
    visitsByDay: DayRow[];
  }>("website");

  return (
    <AdminShell title="Website" hint="Signups are accounts. Landing visits count one per browser per day, starting from when this tracking went live.">
      <OwnerState error={error} ready={Boolean(data)} />
      {data && (
        <>
          <AdminStats items={[
            { label: "Accounts", value: String(data.signupsAll), hint: `${data.activeAccounts} active · ${data.deactivated} deactivated` },
            { label: "Signed up today", value: String(data.signupsToday), hint: `${data.signupsWeek} in 7 days · ${data.signupsMonth} this month` },
            { label: "Landing visits today", value: String(data.visitsToday), hint: `${data.visitsWeek} in 7 days · ${data.visitsMonth} this month` },
            { label: "Visits all time", value: String(data.visitsAll), hint: `${data.groupsToday} groups today · ${data.paymentsToday} receipts today` },
          ]} />
          <div className="owner-split">
            <section>
              <h2>Signups, last 30 days</h2>
              <AdminBars rows={data.signupsByDay.map((row) => ({ label: String(row.day).slice(5), count: Number(row.count) }))} />
            </section>
            <section>
              <h2>Landing visits, last 30 days</h2>
              <AdminBars rows={data.visitsByDay.map((row) => ({ label: String(row.day).slice(5), count: Number(row.count) }))} />
            </section>
            <section>
              <h2>Language</h2>
              <AdminBars rows={data.languages} />
            </section>
            <section>
              <h2>This month</h2>
              <AdminBars rows={[
                { label: "New accounts", count: Number(data.signupsMonth) },
                { label: "New groups", count: Number(data.groupsMonth) },
                { label: "Receipts", count: Number(data.paymentsMonth) },
                { label: "Landing visits", count: Number(data.visitsMonth) },
              ]} />
            </section>
          </div>
        </>
      )}
    </AdminShell>
  );
}

type PayRow = {
  paid_at: string;
  amount: number;
  kind: string;
  mode: string;
  cycle: number;
  chit_name: string;
  member_name: string;
  member_phone: string;
};

export function AdminCollectionsPage() {
  const { data, error } = useAdminReport<{
    count: number;
    total: number;
    today: number;
    month: number;
    byMode: CountRow[];
    byKind: CountRow[];
    recent: PayRow[];
  }>("collections");
  const [q, setQ] = useState("");
  const rows = useMemo(
    () => (data?.recent || []).filter((row) => qMatch(q, [row.chit_name, row.member_name, row.member_phone, row.mode, row.kind])),
    [data, q],
  );

  return (
    <AdminShell title="Collections" hint="Receipts organisers marked in the books">
      <OwnerState error={error} ready={Boolean(data)} />
      {data && (
        <>
          <AdminStats items={[
            { label: "Receipts", value: String(data.count) },
            { label: "All time", value: money(data.total) },
            { label: "Today", value: money(data.today) },
            { label: "This month", value: money(data.month) },
          ]} />
          <div className="owner-split">
            <section><h2>By mode</h2><AdminBars rows={data.byMode.map((row) => ({ label: `${row.label} · ${money(row.amount)}`, count: Number(row.count) }))} /></section>
            <section><h2>By kind</h2><AdminBars rows={data.byKind.map((row) => ({ label: `${row.label} · ${money(row.amount)}`, count: Number(row.count) }))} /></section>
          </div>
          <Search value={q} onChange={setQ} placeholder="Search group, member, phone" />
          <div className="owner-table-wrap">
            <table className="owner-table">
              <thead>
                <tr><th>When</th><th>Group</th><th>Member</th><th>Phone</th><th>Round</th><th>Kind</th><th>Mode</th><th>Amount</th></tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={`${row.paid_at}-${row.member_phone}-${i}`}>
                    <td>{when(row.paid_at)}</td>
                    <td>{row.chit_name}</td>
                    <td>{row.member_name || "—"}</td>
                    <td>{row.member_phone || "—"}</td>
                    <td>{row.cycle}</td>
                    <td>{row.kind}</td>
                    <td>{row.mode}</td>
                    <td>{money(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminShell>
  );
}

type AwardRow = {
  created_at: string;
  cycle: number;
  method: string;
  payout: number;
  bid: number;
  commission: number;
  dividend: number;
  chit_name: string;
  winner_name: string;
  winner_phone: string;
};

export function AdminAwardsPage() {
  const { data, error } = useAdminReport<{
    count: number;
    payout: number;
    commission: number;
    dividend: number;
    today: number;
    month: number;
    byMethod: CountRow[];
    recent: AwardRow[];
  }>("awards");
  const [q, setQ] = useState("");
  const rows = useMemo(
    () => (data?.recent || []).filter((row) => qMatch(q, [row.chit_name, row.winner_name, row.winner_phone, row.method])),
    [data, q],
  );

  return (
    <AdminShell title="Awards" hint="Auction, lucky draw, and fixed prizes recorded on the books">
      <OwnerState error={error} ready={Boolean(data)} />
      {data && (
        <>
          <AdminStats items={[
            { label: "Awards", value: String(data.count), hint: `${data.today} today · ${data.month} this month` },
            { label: "Prize recorded", value: money(data.payout) },
            { label: "Commission recorded", value: money(data.commission) },
            { label: "Dividend recorded", value: money(data.dividend) },
          ]} />
          <section className="owner-block">
            <h2>By method</h2>
            <AdminBars rows={data.byMethod.map((row) => ({ label: `${row.label} · ${money(row.payout)}`, count: Number(row.count) }))} />
          </section>
          <Search value={q} onChange={setQ} placeholder="Search group, winner, phone" />
          <div className="owner-table-wrap">
            <table className="owner-table">
              <thead>
                <tr><th>When</th><th>Group</th><th>Winner</th><th>Phone</th><th>Round</th><th>Method</th><th>Prize</th><th>Bid</th><th>Commission</th><th>Dividend</th></tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={`${row.created_at}-${row.winner_phone}-${i}`}>
                    <td>{when(row.created_at)}</td>
                    <td>{row.chit_name}</td>
                    <td>{row.winner_name || "—"}</td>
                    <td>{row.winner_phone || "—"}</td>
                    <td>{row.cycle}</td>
                    <td>{row.method}</td>
                    <td>{money(row.payout)}</td>
                    <td>{money(row.bid)}</td>
                    <td>{money(row.commission)}</td>
                    <td>{money(row.dividend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminShell>
  );
}

type OrganiserRow = {
  id: string;
  name: string;
  phone: string;
  language: string;
  created_at: string;
  deactivated_at: string | null;
  groups: number;
  running: number;
  people: number;
  collected: number;
};

export function AdminOrganisersPage() {
  const { data, error } = useAdminReport<{ rows: OrganiserRow[] }>("organisers");
  const [q, setQ] = useState("");
  const rows = useMemo(
    () => (data?.rows || []).filter((row) => qMatch(q, [row.name, row.phone, row.language])),
    [data, q],
  );

  return (
    <AdminShell title="Organisers" hint="Accounts that sign in and run groups">
      <OwnerState error={error} ready={Boolean(data)} />
      {data && (
        <>
          <Search value={q} onChange={setQ} placeholder="Search name or phone" />
          <div className="owner-table-wrap">
            <table className="owner-table">
              <thead>
                <tr><th>Organiser</th><th>Phone</th><th>Language</th><th>Joined</th><th>Status</th><th>Groups</th><th>Running</th><th>People</th><th>Collected</th></tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td><strong>{row.name}</strong></td>
                    <td>{row.phone || "—"}</td>
                    <td>{row.language}</td>
                    <td>{when(row.created_at)}</td>
                    <td>{row.deactivated_at ? "Deactivated" : "Active"}</td>
                    <td>{row.groups}</td>
                    <td>{row.running}</td>
                    <td>{row.people}</td>
                    <td>{money(row.collected)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminShell>
  );
}

type TicketRow = {
  id: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  owner_name: string;
  owner_phone: string;
};

export function AdminSupportPage() {
  const { data, error } = useAdminReport<{ open: number; closed: number; rows: TicketRow[] }>("support");

  return (
    <AdminShell title="Support" hint="Messages sent from the in-app support form">
      <OwnerState error={error} ready={Boolean(data)} />
      {data && (
        <>
          <AdminStats items={[
            { label: "Open", value: String(data.open) },
            { label: "Closed", value: String(data.closed) },
          ]} />
          <div className="owner-tickets">
            {(data.rows || []).map((row) => (
              <article key={row.id}>
                <header>
                  <strong>{row.subject}</strong>
                  <span>{row.status}</span>
                </header>
                <p>{row.message}</p>
                <footer>{row.owner_name || "Organiser"} · {row.owner_phone || "No phone"} · {when(row.created_at)}</footer>
              </article>
            ))}
            {!data.rows?.length && <p className="owner-empty">No support messages yet.</p>}
          </div>
        </>
      )}
    </AdminShell>
  );
}
