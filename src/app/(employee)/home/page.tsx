import type { CSSProperties } from "react";
import Link from "next/link";
import { requireRole } from "@/features/auth/session";
import { getSqlPool, sql } from "@/lib/db/sqlserver";
import { BeeMascot } from "@/components/ui/BeeMascot";
import { EmployeeProfileCard } from "@/components/employee/EmployeeProfileCard";

export const dynamic = "force-dynamic";
type Activity = {
  title: string; description: string | null; group: string; available: string;
  included: boolean; status: string;
};
type Journey = { id: string; title: string; start: string; status: string };
const STEPS = [
  { code: "D1", title: "Welcome", day: 1 },
  { code: "D7", title: "Align", day: 7 },
  { code: "D30", title: "Learn", day: 30 },
  { code: "D60", title: "Perform", day: 60 },
  { code: "D90", title: "Contribute", day: 90 },
];
function localDay() {
  return new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Ho_Chi_Minh", year:"numeric", month:"2-digit", day:"2-digit"}).format(new Date());
}
function diffDays(a: string, b: string) {
  return Math.floor((Date.parse(b + "T00:00:00Z")-Date.parse(a + "T00:00:00Z"))/86400000)+1;
}
function isDone(a: Activity) { return a.status === "completed" || a.status === "waived"; }
function rate(items: Activity[]) { return items.length ? Math.round(items.filter(isDone).length / items.length * 100) : null; }
function groupStep(group: string) {
  const match = group.match(/D\s*(1|7|30|60|90)\b/i);
  if(match) return "D"+match[1];
  const aliases = ["WELCOME","ALIGN","LEARN","PERFORM","CONTRIBUTE"];
  const index = aliases.findIndex(x=>group.toUpperCase().includes(x));
  return index < 0 ? null : STEPS[index].code;
}
function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-GB", {timeZone:"Asia/Ho_Chi_Minh",hour:"2-digit",hourCycle:"h23"}).format(new Date()));
  return hour < 11 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";
}

export default async function EmployeeHomePage() {
  const profile = await requireRole("employee");
  const pool = await getSqlPool();
  const today = localDay();
  const [journeysResult, employeeResult] = await Promise.all([
    pool.request().input("employeeId",sql.UniqueIdentifier,profile.id).query(
      "SELECT TOP 1 Id AS id, TitleSnapshot AS title, CONVERT(NVARCHAR(10),StartDate,23) AS start, Status AS status "+
      "FROM app.EmployeeJourneys WHERE EmployeeId=@employeeId "+
      "ORDER BY CASE WHEN Status=N'active' THEN 0 ELSE 1 END, StartDate DESC, AssignedAt DESC"
    ),
    pool.request().input("employeeId",sql.UniqueIdentifier,profile.id).query(
      "SELECT CONVERT(NVARCHAR(10),StartDate,23) AS start_date FROM app.Profiles WHERE Id=@employeeId"
    ),
  ]);
  const journey: Journey | null = journeysResult.recordset[0] ?? null;
  const profileStart: string | null = employeeResult.recordset[0]?.start_date ?? null;
  const journeyDay = journey ? diffDays(journey.start, today) : null;
  const currentStep = journeyDay === null || journeyDay <= 0 ? -1 :
    STEPS.reduce((last, step, index) => journeyDay >= step.day ? index : last, -1);
  let activities: Activity[] = [];
  if (journey) {
    const result = await pool.request().input("journeyId",sql.UniqueIdentifier,journey.id).query(
      "SELECT TitleSnapshot AS title, DescriptionSnapshot AS description, "+
      "MilestoneNameSnapshot AS [group], CONVERT(NVARCHAR(10),AvailableAt,23) AS available, "+
      "IncludeInProgress AS included, Status AS status "+
      "FROM app.JourneyActivities WHERE JourneyId=@journeyId AND Status<>N'removed' "+
      "ORDER BY MilestoneSequence,ActivitySequence"
    );
    activities = result.recordset.map(row=>({
      title:String(row.title),
      description:row.description ? String(row.description) : null,
      group:String(row.group),
      available:String(row.available),
      included:Boolean(row.included),
      status:String(row.status),
    }));
  }
  const open = activities.filter(a=>a.available<=today && journey?.status==="active");
  const eligible = open.filter(a=>a.included);
  const completed = eligible.filter(isDone).length;
  const overall = rate(eligible);
  const next = open.find(a=>!isDone(a)) ?? null;
  const groupMap = new Map<string,Activity[]>();
  for(const activity of open) {
    const current = groupMap.get(activity.group) ?? [];
    current.push(activity);
    groupMap.set(activity.group,current);
  }
  const groups = [...groupMap.entries()].map(([name,items])=>({
    name, items, value:rate(items.filter(a=>a.included)),
    pending:items.some(a=>!isDone(a)),
  })).sort((a,b)=>Number(b.pending)-Number(a.pending)).slice(0,3);
  const activeStep = currentStep>=0 ? STEPS[currentStep] : null;
  const upcoming = STEPS[Math.min(Math.max(currentStep+1,0),4)];
  const milestoneItems = activeStep ? eligible.filter(a=>groupStep(a.group)===activeStep.code) : [];
  const milestoneProgress = rate(milestoneItems);
  const line = Math.max(0,currentStep)*20;
  const firstName = profile.display_name.trim().split(/\s+/).slice(-1)[0] || profile.display_name;
  const doneJourney = journey?.status === "completed";

  return <div className="bw-home">
    <header className="bw-home-heading">
      <h1>{greeting()}, {firstName}! <span aria-hidden="true">👋</span></h1>
      <p>Chào mừng bạn đến với BeeWelcome — nơi đồng hành cùng bạn trong hành trình hội nhập tại Bee Logistics.</p>
    </header>
    <div className="bw-home-grid">
      <div className="bw-home-main">
        <section className="bw-panel bw-journey-card" aria-labelledby="bw-journey-heading">
          <div className="bw-section-top">
            <div><h2 id="bw-journey-heading">Your Onboarding Journey</h2>
              <p>{journey ? journeyDay !== null && journeyDay<=0 ? "Hành trình sẽ bắt đầu từ ngày nhận việc." : "Hành trình 90 ngày · Day "+Math.min(Math.max(journeyDay ?? 1,1),90)+"/90" : "HR chưa phân công lộ trình hội nhập cho bạn."}</p>
            </div>
            <Link className="bw-text-action" href="/roadmap">Xem Roadmap →</Link>
          </div>
          <div className="bw-milestone-track" style={{"--bw-journey-completed":line+"%"} as CSSProperties} aria-label="Các mốc của hành trình 90 ngày">
            {STEPS.map((step,i)=>{
              const reached=journey!==null && currentStep>=i;
              const active=reached && i===currentStep && !doneJourney;
              return <div className={"bw-milestone"+(active?" is-current":reached?" is-done":"")} key={step.code}>
                <span className="bw-milestone-bubble" aria-hidden="true">{active?"●":reached?"✓":"○"}</span>
                <strong>{step.code}</strong><span>{step.title}</span>
              </div>;
            })}
          </div>
        </section>
        <section className="bw-panel bw-next-card" aria-labelledby="bw-continue-heading">
          <div className="bw-next-copy">
            <span className="bw-eyebrow">{next?"CONTINUE LEARNING":"WELCOME TO BEE"}</span>
            <h2 id="bw-continue-heading">{next?.title || (doneJourney?"Bạn đã hoàn tất hành trình!":journey?"Khám phá hành trình của bạn":"Sẵn sàng đồng hành cùng BeeWelcome")}</h2>
            <p>{next ? next.description || "Tiếp tục khám phá nội dung đang mở trong lộ trình của bạn." : journey?"Các mốc và nội dung học tập đã được HR phân công nằm trong Roadmap.":"Phòng Nhân sự sẽ phân công lộ trình học tập phù hợp với bạn."}</p>
            <div className="bw-next-meta">
              <Link href="/roadmap" className="bw-primary">{next?"Tiếp tục học →":"Mở Roadmap →"}</Link>
              {next&&<span className="bw-note-text">{next.group}</span>}
            </div>
          </div>
          <div className="bw-next-art" aria-hidden="true"><BeeMascot size="lg" mood="studying"/></div>
        </section>
        <section className="bw-panel bw-modules-panel" aria-labelledby="bw-modules-heading">
          <div className="bw-section-top"><div>
            <h2 id="bw-modules-heading">Your Current Modules</h2>
            <p>Các nhóm nội dung được phân công trong hành trình của bạn.</p>
          </div><Link href="/roadmap" className="bw-text-action">Xem tất cả →</Link></div>
          {groups.length ? <div className="bw-module-list">
            {groups.map((group,index)=><div className="bw-module-row" key={group.name}>
              <div className="bw-module-icon" aria-hidden="true">{index===0?"✦":index===1?"▣":"◇"}</div>
              <div><h3 className="bw-module-title">{group.name}</h3><p className="bw-module-caption">{group.items.length} hoạt động đã mở · {group.pending?"Đang thực hiện":"Đã hoàn thành"}</p></div>
              <div><div className="bw-module-progress-label">{group.value===null?"Không tính tiến độ":group.value+"% hoàn thành"}</div><div className="bw-progress-track"><div className="bw-progress-fill" style={{width:(group.value??0)+"%"}}/></div></div>
              <Link href="/roadmap" className="bw-module-link">{group.pending?"Tiếp tục":"Xem lại"}</Link>
            </div>)}
          </div>:<p className="bw-empty">{journey?"Chưa có nhóm nội dung nào được mở vào thời điểm này.":"Nội dung sẽ hiển thị sau khi HR phân công lộ trình."}</p>}
        </section>
      </div>
      <aside className="bw-home-side" aria-label="Tổng quan nhân viên">
        <EmployeeProfileCard journeyDay={journeyDay} profile={{
          displayName:profile.display_name,email:profile.email,employeeCode:profile.employee_code,
          position:profile.position,department:profile.department,office:profile.office,
          startDate:profileStart||journey?.start||null,
        }}/>
        <section className="bw-panel bw-side-card" aria-labelledby="bw-progress-heading">
          <h2 id="bw-progress-heading">My Progress</h2>
          <div className="bw-overall-row">
            <div className="bw-donut" role="img" aria-label={overall===null?"Chưa có dữ liệu tiến độ":"Đã hoàn thành "+overall+" phần trăm các hoạt động hợp lệ đã mở"} style={{"--percentage":(overall??0)+"%"} as CSSProperties}>
              <div className="bw-donut-inner"><strong>{overall===null?"—":overall+"%"}</strong><span>Overall<br/>Progress</span></div>
            </div>
            <div className="bw-progress-facts">
              <div className="bw-progress-fact"><strong>{completed}/{eligible.length}</strong><span>Hoạt động hợp lệ đã mở</span></div>
              <div className="bw-progress-fact"><strong>{activities.length}</strong><span>Tổng hoạt động được giao</span></div>
              <div className="bw-progress-fact"><strong>{groups.length}</strong><span>Nhóm nội dung đã mở</span></div>
            </div>
          </div>
          <p className="bw-progress-help">{overall===null?"Chưa có dữ liệu tiến độ.":"Tiến độ tính theo hoạt động hợp lệ đã mở, độc lập với số ngày hội nhập."}</p>
        </section>
        <section className="bw-panel bw-side-card bw-milestone-side" aria-labelledby="bw-next-milestone-heading">
          <h2 id="bw-next-milestone-heading">My Next Milestone</h2>
          <div className="bw-milestone-message"><span className="bw-small-icon" aria-hidden="true">⚑</span>
            <div><strong>{!journey?"Chờ phân công":doneJourney?"Hành trình đã hoàn tất":currentStep===4?"D90 · Contribute":upcoming.code+" · "+upcoming.title}</strong>
              <p>{!journey?"Phòng Nhân sự sẽ phân công lộ trình cho bạn.":currentStep===4?"Bạn đã đến mốc cuối của hành trình.":"Mốc tiếp theo của hành trình 90 ngày."}</p>
            </div>
          </div>
          <div className="bw-progress-track"><div className="bw-progress-fill" style={{width:(milestoneProgress??0)+"%"}}/></div>
          <div className="bw-small-progress"><span>Hoạt động chặng hiện tại</span><strong>{milestoneProgress===null?"Chưa có dữ liệu":milestoneItems.filter(isDone).length+"/"+milestoneItems.length+" · "+milestoneProgress+"%"}</strong></div>
        </section>
        <section className="bw-panel bw-side-card bw-tip-card" aria-labelledby="bw-tip-heading">
          <h2 id="bw-tip-heading">✧ Learning Tip</h2><p>Dành một chút thời gian mỗi ngày để khám phá điều mới. Mọi bước tiến đều đáng ghi nhận!</p>
        </section>
      </aside>
    </div>
  </div>;
}
