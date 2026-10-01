/** `size` sets width and height in pixels, for renderers that have no CSS classes. */
type SvgProps = { className?: string; title?: string; size?: number };

const FUR = "#b9b4c7";
const FUR_DARK = "#8e879f";
const EAR = "#f9a8d4";
const NOSE = "#ec4899";
const INK = "#1c1917";

/** Simplified mouse head. Used for the logo, favicon, and Slack avatar. */
export function LogoMark({ className, title = "Meeting Mouse", size }: SvgProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="16" cy="18" r="12" fill={FUR} />
      <circle cx="48" cy="18" r="12" fill={FUR} />
      <circle cx="16" cy="18" r="7" fill={EAR} />
      <circle cx="48" cy="18" r="7" fill={EAR} />
      <ellipse cx="32" cy="36" rx="23" ry="20" fill={FUR} />
      <circle cx="24" cy="34" r="3.2" fill={INK} />
      <circle cx="40" cy="34" r="3.2" fill={INK} />
      <circle cx="25.2" cy="32.8" r="1" fill="#fff" />
      <circle cx="41.2" cy="32.8" r="1" fill="#fff" />
      <circle cx="32" cy="43" r="3" fill={NOSE} />
      <path
        d="M29 48 q3 3 6 0"
        stroke={INK}
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/** Mark plus wordmark, for the site header and footer. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold ${className}`}>
      <LogoMark className="h-8 w-8" />
      <span>
        Meeting <span className="text-accent">Mouse</span>
      </span>
    </span>
  );
}

/** Full mascot: the mouse holding a calendar with a checked-off day. */
export function Mascot({ className, title = "Meeting Mouse mascot", size }: SvgProps) {
  return (
    <svg
      viewBox="0 0 240 240"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* tail */}
      <path
        d="M168 206 c34 6 50 -14 38 -40"
        stroke={FUR_DARK}
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />
      {/* body */}
      <ellipse cx="120" cy="196" rx="56" ry="36" fill={FUR} />
      {/* ears */}
      <circle cx="62" cy="62" r="36" fill={FUR} />
      <circle cx="178" cy="62" r="36" fill={FUR} />
      <circle cx="62" cy="62" r="22" fill={EAR} />
      <circle cx="178" cy="62" r="22" fill={EAR} />
      {/* head */}
      <ellipse cx="120" cy="120" rx="70" ry="62" fill={FUR} />
      {/* blush */}
      <ellipse cx="78" cy="142" rx="11" ry="6" fill={EAR} opacity="0.8" />
      <ellipse cx="162" cy="142" rx="11" ry="6" fill={EAR} opacity="0.8" />
      {/* whiskers */}
      <g stroke={FUR_DARK} strokeWidth="3" strokeLinecap="round">
        <line x1="72" y1="136" x2="42" y2="128" />
        <line x1="72" y1="144" x2="42" y2="150" />
        <line x1="168" y1="136" x2="198" y2="128" />
        <line x1="168" y1="144" x2="198" y2="150" />
      </g>
      {/* eyes */}
      <circle cx="95" cy="114" r="9" fill={INK} />
      <circle cx="145" cy="114" r="9" fill={INK} />
      <circle cx="98.5" cy="110.5" r="3.2" fill="#fff" />
      <circle cx="148.5" cy="110.5" r="3.2" fill="#fff" />
      {/* nose + mouth */}
      <circle cx="120" cy="139" r="8" fill={NOSE} />
      <path
        d="M110 151 q10 9 20 0"
        stroke={INK}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* calendar */}
      <rect
        x="84"
        y="172"
        width="72"
        height="58"
        rx="9"
        fill="#fff"
        stroke="#d6d3d1"
        strokeWidth="2"
      />
      <path d="M84 181 a9 9 0 0 1 9 -9 h54 a9 9 0 0 1 9 9 v9 h-72 z" fill="#4a154b" />
      <circle cx="102" cy="172" r="3.5" fill="#fff" />
      <circle cx="138" cy="172" r="3.5" fill="#fff" />
      <path
        d="M104 209 l11 11 l21 -22"
        stroke="#10b981"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* paws */}
      <circle cx="86" cy="186" r="9" fill={FUR} />
      <circle cx="154" cy="186" r="9" fill={FUR} />
    </svg>
  );
}
