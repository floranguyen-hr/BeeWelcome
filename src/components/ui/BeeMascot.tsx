import React from "react";

interface BeeMascotProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  mood?: "happy" | "cheering" | "studying";
}

export function BeeMascot({
  size = "md",
  className = "",
  mood = "happy",
}: BeeMascotProps) {
  const dimensions = {
    sm: { width: 44, height: 44 },
    md: { width: 72, height: 72 },
    lg: { width: 104, height: 104 },
  }[size];

  return (
    <div
      className={`mascot-avatar ${className}`}
      style={{
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        userSelect: "none",
      }}
      aria-label="Mascot Ong Bee Logistics"
    >
      {/* Vòng hào quang phát sáng nhẹ */}
      <div
        style={{
          position: "absolute",
          inset: "-4px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255, 201, 40, 0.45) 0%, rgba(255, 90, 0, 0.15) 60%, transparent 80%)",
          filter: "blur(4px)",
          zIndex: 0,
        }}
      />

      {/* SVG Chú Ong Vàng Siêu Đáng Yêu & Chuyên Nghiệp */}
      <svg
        width={dimensions.width}
        height={dimensions.height}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: "relative", zIndex: 1, overflow: "visible" }}
      >
        <defs>
          <linearGradient id="beeBody" x1="20" y1="20" x2="80" y2="85" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFD43F" />
            <stop offset="0.6" stopColor="#FFB800" />
            <stop offset="1" stopColor="#FF5A00" />
          </linearGradient>

          <linearGradient id="beeWing" x1="0" y1="0" x2="30" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="1" stopColor="#E0F2FE" stopOpacity="0.65" />
          </linearGradient>

          <filter id="subtleShadow" x="-10%" y="-10%" width="120%" height="130%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#252525" floodOpacity="0.18" />
          </filter>
        </defs>

        {/* Cánh Trái (Có hiệu ứng vỗ cánh nhẹ) */}
        <g style={{ transformOrigin: "42px 42px", animation: "wingLeft 0.8s ease-in-out infinite alternate" }}>
          <ellipse
            cx="32"
            cy="28"
            rx="16"
            ry="24"
            transform="rotate(-32 32 28)"
            fill="url(#beeWing)"
            stroke="#BAE6FD"
            strokeWidth="1.5"
            filter="url(#subtleShadow)"
          />
          <path d="M30 20C32 26 34 32 36 38" stroke="#7DD3FC" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
        </g>

        {/* Cánh Phải (Có hiệu ứng vỗ cánh nhẹ) */}
        <g style={{ transformOrigin: "58px 42px", animation: "wingRight 0.8s ease-in-out infinite alternate" }}>
          <ellipse
            cx="68"
            cy="28"
            rx="16"
            ry="24"
            transform="rotate(32 68 28)"
            fill="url(#beeWing)"
            stroke="#BAE6FD"
            strokeWidth="1.5"
            filter="url(#subtleShadow)"
          />
          <path d="M70 20C68 26 66 32 64 38" stroke="#7DD3FC" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
        </g>

        {/* Thân Ong Bầu Bĩnh (Bee Body) */}
        <ellipse cx="50" cy="58" rx="32" ry="28" fill="url(#beeBody)" filter="url(#subtleShadow)" />

        {/* Sọc Đen Than Chì Đặc Trưng (Logistics Stripes) */}
        <path
          d="M26 53C32 50 68 50 74 53C73 60 70 65 66 69C56 67 44 67 34 69C30 65 27 60 26 53Z"
          fill="#252525"
        />
        <path
          d="M34 71C42 70 58 70 66 71C63 76 58 80 50 82C42 80 37 76 34 71Z"
          fill="#252525"
        />

        {/* Ngòi Ong Nhỏ Đáng Yêu Phía Sau */}
        <path d="M50 85L47 91C49 92 51 92 53 91L50 85Z" fill="#252525" />

        {/* Cặp Râu Ong Cong Xinh Xắn */}
        <path
          d="M42 34C38 24 30 20 25 22"
          stroke="#252525"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="24" cy="22" r="4" fill="#FF5A00" />

        <path
          d="M58 34C62 24 70 20 75 22"
          stroke="#252525"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="76" cy="22" r="4" fill="#FF5A00" />

        {/* Mắt To Tròn Long Lanh (Expressive Eyes) */}
        <ellipse cx="40" cy="46" rx="5" ry="6.5" fill="#252525" />
        <ellipse cx="60" cy="46" rx="5" ry="6.5" fill="#252525" />

        {/* Đốm Sáng Mắt (Catchlights) */}
        <circle cx="38" cy="44" r="2" fill="#FFFFFF" />
        <circle cx="42" cy="47" r="1" fill="#FFFFFF" />
        <circle cx="58" cy="44" r="2" fill="#FFFFFF" />
        <circle cx="62" cy="47" r="1" fill="#FFFFFF" />

        {/* Má Hồng Dễ Thương (Cute Cheeks) */}
        <ellipse cx="32" cy="52" rx="4" ry="2.5" fill="#FF5A00" fillOpacity="0.4" />
        <ellipse cx="68" cy="52" rx="4" ry="2.5" fill="#FF5A00" fillOpacity="0.4" />

        {/* Nụ Cười Thân Thiện (Friendly Smile) */}
        <path
          d="M45 53C47 56 53 56 55 53"
          stroke="#252525"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Điểm Nhấn: Nơ Cà Vạt Cam Bee Logistics Nhỏ Xinh */}
        <g transform="translate(46, 61)">
          <polygon points="0,0 8,3 8,-3" fill="#FF5A00" />
          <polygon points="8,0 0,3 0,-3" fill="#FF5A00" />
          <circle cx="4" cy="0" r="2" fill="#FFFFFF" />
        </g>
      </svg>
    </div>
  );
}
