"use client";

import { useRef } from "react";

export type EmployeeHomeProfile = {
  displayName: string;
  email: string;
  employeeCode: string | null;
  position: string | null;
  department: string | null;
  office: string | null;
  startDate: string | null;
};

function formattedDate(iso: string | null) {
  if (!iso) return "Chưa cập nhật";
  const parts = iso.slice(0, 10).split("-");
  return parts.length === 3 ? parts.reverse().join("/") : iso;
}

export function EmployeeProfileCard({ profile, journeyDay }: { profile: EmployeeHomeProfile; journeyDay: number | null }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const initial = profile.displayName.trim().split(/\s+/).slice(-2).map((part) => part[0]?.toUpperCase()).join("");
  const subtitle = [profile.position, profile.department].filter(Boolean).join(" · ") || "Thành viên Bee Logistics";

  return (
    <>
      <section className="bw-panel bw-person-card" aria-labelledby="bw-person-title">
        <button type="button" className="bw-person-open" onClick={() => dialogRef.current?.showModal()} aria-label="Xem hồ sơ nhân viên">↗</button>
        <div className="bw-person-avatar" aria-hidden="true">{initial || "B"}</div>
        <div className="bw-person-text">
          <h2 id="bw-person-title">{profile.displayName}</h2>
          <p>{subtitle}</p>
          <span className="bw-day-pill">
            <span className="bw-day-leaf" aria-hidden="true">✦</span>
            {journeyDay === null ? "Chưa phân công hành trình" : journeyDay <= 0 ? "Chuẩn bị nhận việc" : journeyDay > 90 ? "Đã qua ngày 90" : `Onboarding · Day ${journeyDay}/90`}
          </span>
        </div>
      </section>
      <dialog ref={dialogRef} className="bw-profile-dialog" aria-labelledby="bw-dialog-title"
        onClick={(event) => { if (event.target === dialogRef.current) dialogRef.current.close(); }}>
        <div className="bw-modal-heading">
          <div><h2 id="bw-dialog-title">Hồ sơ nhân viên</h2><p>Thông tin từ hệ thống quản lý nhân sự.</p></div>
          <button type="button" className="bw-modal-close" onClick={() => dialogRef.current?.close()} aria-label="Đóng hồ sơ">×</button>
        </div>
        <dl className="bw-profile-fields">
          {([
            ["Họ và tên", profile.displayName],
            ["Mã nhân viên", profile.employeeCode],
            ["Chức danh", profile.position],
            ["Phòng ban", profile.department],
            ["Văn phòng", profile.office],
            ["Ngày nhận việc", formattedDate(profile.startDate)],
            ["Email", profile.email],
          ] as [string, string | null][]).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Chưa cập nhật"}</dd></div>)}
        </dl>
        <p className="bw-profile-help">Nếu cần điều chỉnh thông tin, vui lòng liên hệ HR qua mục Support.</p>
      </dialog>
    </>
  );
}
