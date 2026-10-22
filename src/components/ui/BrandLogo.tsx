import React from "react";
import Image from "next/image";
import Link from "next/link";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  href?: string;
}

export function BrandLogo({
  className = "",
  size = "md",
  showTagline = true,
  href = "/",
}: BrandLogoProps) {
  const iconSize = {
    sm: 36,
    md: 46,
    lg: 60,
  }[size];

  const brandTextSize = {
    sm: "1.1rem",
    md: "1.35rem",
    lg: "1.75rem",
  }[size];

  const taglineSize = {
    sm: "0.68rem",
    md: "0.75rem",
    lg: "0.88rem",
  }[size];

  const content = (
    <div className={`inline-flex items-center gap-3 ${className}`} style={{ userSelect: "none" }}>
      {/* Biểu tượng logo Bee Logistics chính hãng */}
      <div
        style={{
          width: `${iconSize}px`,
          height: `${iconSize}px`,
          position: "relative",
          borderRadius: "8px",
          overflow: "hidden",
          flexShrink: 0,
          background: "#FFFFFF",
          boxShadow: "0 2px 8px rgba(37, 37, 37, 0.06)",
          border: "1px solid rgba(255, 90, 0, 0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Image
          src="/brand/bee-logistics-logo.png"
          alt="Bee Logistics"
          width={iconSize}
          height={iconSize}
          priority
          style={{
            objectFit: "contain",
            width: "100%",
            height: "100%",
            transform: "scale(1.25)",
          }}
        />
      </div>

      {/* Brand Typography & Slogan */}
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.25rem" }}>
          <span
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 800,
              fontSize: brandTextSize,
              letterSpacing: "-0.03em",
              color: "#252525",
            }}
          >
            BEE
          </span>
          <span
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 800,
              fontSize: brandTextSize,
              letterSpacing: "-0.03em",
              color: "var(--color-primary)",
            }}
          >
            LOGISTICS
          </span>
        </div>

        {showTagline && (
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontWeight: 500,
              fontSize: taglineSize,
              color: "var(--color-text-muted)",
              letterSpacing: "0.02em",
              marginTop: "2px",
            }}
          >
            Be expert in logistics · Onboarding
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-label="Bee Logistics Onboarding Home"
        style={{ display: "inline-block", textDecoration: "none" }}
      >
        {content}
      </Link>
    );
  }

  return content;
}
