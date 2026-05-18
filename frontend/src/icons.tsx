/**
 * Stroke ikonlar — her biri kullanıldığı bağlamla uyumlu (liste taraması, API anahtarı, adımlar vb.)
 */

type IconProps = { className?: string; size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

/** Ürün / uyumluluk — uygulama işareti */
export function IconShieldCheck({ className, size = 22 }: IconProps) {
  const p = base(size);
  return (
    <svg {...p} className={className} aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

/** API anahtarı — gerçek anahtar şekli (kilit değil) */
export function IconKey({ className, size = 20 }: IconProps) {
  const p = base(size);
  return (
    <svg {...p} className={className} aria-hidden>
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.17 9.17" />
      <path d="M15.5 7.5 18 10" />
    </svg>
  );
}

/** Kayıtlı yapılandırma — anahtar tanımlı */
export function IconBadgeCheck({ className, size = 18 }: IconProps) {
  const p = base(size);
  return (
    <svg {...p} className={className} aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

/** Listeleme metni — başlık + gövde satırları */
export function IconFileText({ className, size = 20 }: IconProps) {
  const p = base(size);
  return (
    <svg {...p} className={className} aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}

/** Risk uyarıları */
export function IconShieldAlert({ className, size = 20 }: IconProps) {
  const p = base(size);
  return (
    <svg {...p} className={className} aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}

/** Ardışık işlem adımları (pipeline) */
export function IconListTimeline({ className, size = 20 }: IconProps) {
  const p = base(size);
  return (
    <svg {...p} className={className} aria-hidden>
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v5" />
      <circle cx="12" cy="14" r="2" />
      <path d="M12 16v3" />
      <circle cx="12" cy="21" r="2" />
    </svg>
  );
}

/** Denetçi / denge kararı */
export function IconScale({ className, size = 20 }: IconProps) {
  const p = base(size);
  return (
    <svg {...p} className={className} aria-hidden>
      <path d="M12 3v18M3 21h18" />
      <path d="m6 9-2.5 5h5L6 9zm12 0-2.5 5h5l-2.5-5z" />
    </svg>
  );
}

/** Ülke / bölge düzenlemeleri */
export function IconGlobe({ className, size = 20 }: IconProps) {
  const p = base(size);
  return (
    <svg {...p} className={className} aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

/** Orijinal ↔ önerilen yan yana karşılaştırma */
export function IconPanelCompare({ className, size = 20 }: IconProps) {
  const p = base(size);
  return (
    <svg {...p} className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M12 3v18" />
    </svg>
  );
}

/** Politika / kural metinleri */
export function IconBookOpen({ className, size = 20 }: IconProps) {
  const p = base(size);
  return (
    <svg {...p} className={className} aria-hidden>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a4 4 0 0 0-4-4H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a4 4 0 0 1 4-4h6z" />
      <path d="M6 8h4M6 12h4M16 8h4M16 12h4" />
    </svg>
  );
}

/** Listeleme metnini tarama / analiz başlat */
export function IconFileSearch({ className, size = 20 }: IconProps) {
  const p = base(size);
  return (
    <svg {...p} className={className} aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <circle cx="11.5" cy="15.5" r="2.5" />
      <path d="M13.3 13.7 16 11" />
    </svg>
  );
}

/** Henüz sonuç yok — bekleyen içerik */
export function IconInbox({ className, size = 20 }: IconProps) {
  const p = base(size);
  return (
    <svg {...p} className={className} aria-hidden>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

export function IconCheck({ className, size = 14 }: IconProps) {
  const p = base(size);
  return (
    <svg {...p} className={className} aria-hidden>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export function IconX({ className, size = 12 }: IconProps) {
  const p = base(size);
  return (
    <svg {...p} className={className} aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function IconAlertTriangle({ className, size = 18 }: IconProps) {
  const p = base(size);
  return (
    <svg {...p} className={className} aria-hidden>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

export function IconSettings({ className, size = 18 }: IconProps) {
  const p = base(size);
  return (
    <svg {...p} className={className} aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

/** İnsan onayı — kullanıcı + onay işareti */
export function IconUserCheck({ className, size = 20 }: IconProps) {
  const p = base(size);
  return (
    <svg {...p} className={className} aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </svg>
  );
}
