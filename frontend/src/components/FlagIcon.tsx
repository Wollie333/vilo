interface FlagIconProps {
  country: string
  className?: string
}

export default function FlagIcon({ country, className = 'w-5 h-4' }: FlagIconProps) {
  const flags: Record<string, JSX.Element> = {
    ZA: (
      <svg viewBox="0 0 640 480" className={className}>
        <defs>
          <clipPath id="za-clip">
            <path d="M0 0h640v480H0z" />
          </clipPath>
        </defs>
        <g clipPath="url(#za-clip)">
          <path fill="#002395" d="M0 0h640v480H0z" />
          <path fill="#de3831" d="M0 0h640v240H0z" />
          <path fill="#fff" d="M0 144h640v192H0z" />
          <path fill="#007a4d" d="M0 192h640v96H0z" />
          <path fill="#000" d="M0 0l320 240L0 480z" />
          <path fill="#ffb612" d="M0 48l256 192L0 432z" />
          <path fill="#007a4d" d="M0 96l192 144L0 384z" />
          <path fill="#fff" d="M0 144l128 96L0 336z" />
        </g>
      </svg>
    ),
    US: (
      <svg viewBox="0 0 640 480" className={className}>
        <path fill="#bd3d44" d="M0 0h640v480H0" />
        <path stroke="#fff" strokeWidth="37" d="M0 55.3h640M0 129h640M0 203h640M0 277h640M0 351h640M0 425h640" />
        <path fill="#192f5d" d="M0 0h364.8v258.5H0" />
        <marker id="us-star" markerHeight="30" markerWidth="30">
          <path fill="#fff" d="m14 0 4.3 13.2H32L21 21.4l4.2 13-11.2-8-11.2 8 4.3-13L-4 13.2h13.7z" />
        </marker>
        <g fill="#fff" transform="scale(.9) translate(20, 20)">
          {[...Array(9)].map((_, row) => (
            [...Array(row % 2 === 0 ? 6 : 5)].map((_, col) => (
              <circle
                key={`${row}-${col}`}
                cx={32 + col * 52 + (row % 2 === 0 ? 0 : 26)}
                cy={24 + row * 28}
                r="8"
                fill="#fff"
              />
            ))
          ))}
        </g>
      </svg>
    ),
    GB: (
      <svg viewBox="0 0 640 480" className={className}>
        <path fill="#012169" d="M0 0h640v480H0z" />
        <path fill="#FFF" d="m75 0 244 181L562 0h78v62L400 241l240 178v61h-80L320 301 81 480H0v-60l239-178L0 64V0h75z" />
        <path fill="#C8102E" d="m424 281 216 159v40L369 281h55zm-184 20 6 35L54 480H0l240-179zM640 0v3L391 191l2-44L590 0h50zM0 0l239 176h-60L0 42V0z" />
        <path fill="#FFF" d="M241 0v480h160V0H241zM0 160v160h640V160H0z" />
        <path fill="#C8102E" d="M0 193v96h640v-96H0zM273 0v480h96V0h-96z" />
      </svg>
    ),
    BW: (
      <svg viewBox="0 0 640 480" className={className}>
        <path fill="#00cbff" d="M0 0h640v480H0z" />
        <path fill="#fff" d="M0 160h640v160H0z" />
        <path d="M0 185h640v110H0z" />
      </svg>
    ),
    NA: (
      <svg viewBox="0 0 640 480" className={className}>
        <defs>
          <clipPath id="na-clip">
            <path d="M0 0h640v480H0z" />
          </clipPath>
        </defs>
        <g clipPath="url(#na-clip)">
          <path fill="#fff" d="M0 0h640v480H0z" />
          <path fill="#003580" d="M0 0h640L0 480z" />
          <path fill="#009543" d="M640 480H0l640-480z" />
          <path fill="#c8102e" d="M0 0h640L0 480z" transform="translate(0 60)" />
          <path fill="#c8102e" d="M640 420H0L640 0z" transform="translate(0 0)" />
          <circle cx="170" cy="170" r="80" fill="#ffce00" />
          <circle cx="170" cy="170" r="60" fill="#003580" />
        </g>
      </svg>
    ),
    ZW: (
      <svg viewBox="0 0 640 480" className={className}>
        <path d="M0 0h640v480H0z" />
        <path fill="#fc0" d="M0 60h640v360H0z" />
        <path fill="#de2010" d="M0 120h640v240H0z" />
        <path fill="#309" d="M0 180h640v120H0z" />
        <path fill="#007a4d" d="M0 60h640v60H0zm0 300h640v60H0z" />
        <path fill="#fff" d="M0 0l320 240L0 480z" />
        <path fill="#fc0" d="M30 0l260 195.5V240l-260 195V0z" />
      </svg>
    ),
    MZ: (
      <svg viewBox="0 0 640 480" className={className}>
        <path fill="#007168" d="M0 0h640v160H0z" />
        <path fill="#fff" d="M0 160h640v16H0z" />
        <path d="M0 176h640v128H0z" />
        <path fill="#fff" d="M0 304h640v16H0z" />
        <path fill="#fce100" d="M0 320h640v160H0z" />
        <path fill="#d21034" d="M0 0l320 240L0 480z" />
      </svg>
    ),
    ZM: (
      <svg viewBox="0 0 640 480" className={className}>
        <path fill="#198a00" d="M0 0h640v480H0z" />
        <path fill="#de2010" d="M426 340h71v140h-71z" />
        <path d="M497 340h71v140h-71z" />
        <path fill="#ef7d00" d="M568 340h71v140h-71z" />
      </svg>
    ),
    KE: (
      <svg viewBox="0 0 640 480" className={className}>
        <path d="M0 0h640v480H0z" />
        <path fill="#060" d="M0 0h640v144H0z" />
        <path fill="#bb0000" d="M0 168h640v144H0z" />
        <path fill="#fff" d="M0 144h640v24H0zm0 168h640v24H0z" />
      </svg>
    ),
    TZ: (
      <svg viewBox="0 0 640 480" className={className}>
        <defs>
          <clipPath id="tz-clip">
            <path d="M0 0h640v480H0z" />
          </clipPath>
        </defs>
        <g clipPath="url(#tz-clip)">
          <path fill="#09f" d="M0 0h640v480H0z" />
          <path fill="#090" d="M640 480H0V0z" />
          <path d="M640 480L0 0v120l640 240z" />
          <path fill="#ff0" d="M640 480L0 0v80l640 240zm0-120L0 120v80l640 240z" />
        </g>
      </svg>
    ),
    NG: (
      <svg viewBox="0 0 640 480" className={className}>
        <path fill="#008751" d="M0 0h213.3v480H0z" />
        <path fill="#fff" d="M213.3 0h213.4v480H213.3z" />
        <path fill="#008751" d="M426.7 0H640v480H426.7z" />
      </svg>
    ),
    GH: (
      <svg viewBox="0 0 640 480" className={className}>
        <path fill="#006b3f" d="M0 0h640v480H0z" />
        <path fill="#fcd116" d="M0 0h640v320H0z" />
        <path fill="#ce1126" d="M0 0h640v160H0z" />
        <path d="M320 160l36.3 111.6H480L385.8 339l36.2 111.5L320 383l-102 67.5 36.2-111.6L160 271.6h123.7z" />
      </svg>
    ),
    DE: (
      <svg viewBox="0 0 640 480" className={className}>
        <path d="M0 0h640v160H0z" />
        <path fill="#d00" d="M0 160h640v160H0z" />
        <path fill="#ffce00" d="M0 320h640v160H0z" />
      </svg>
    ),
    FR: (
      <svg viewBox="0 0 640 480" className={className}>
        <path fill="#002654" d="M0 0h213.3v480H0z" />
        <path fill="#fff" d="M213.3 0h213.4v480H213.3z" />
        <path fill="#ce1126" d="M426.7 0H640v480H426.7z" />
      </svg>
    ),
    NL: (
      <svg viewBox="0 0 640 480" className={className}>
        <path fill="#ae1c28" d="M0 0h640v160H0z" />
        <path fill="#fff" d="M0 160h640v160H0z" />
        <path fill="#21468b" d="M0 320h640v160H0z" />
      </svg>
    ),
    AU: (
      <svg viewBox="0 0 640 480" className={className}>
        <path fill="#00008b" d="M0 0h640v480H0z" />
        <path fill="#fff" d="M0 0v27.95L307.037 250h38.647v-27.95L38.647 0H0zm345.684 0v27.95L38.647 250H0v-27.95L307.037 0h38.647z" />
        <path fill="#fff" d="M144.035 0v250h57.614V0h-57.614zM0 83.333v83.334h345.684V83.333H0z" />
        <path fill="#c8102e" d="M0 100v50h345.684v-50H0zM155.572 0v250h34.54V0h-34.54zM0 250l115.228-83.333h25.765L25.765 250H0zM0 0l115.228 83.333H89.463L0 18.633V0zm204.691 83.333L319.92 0h25.764l-115.228 83.333h-25.765zm140.993 166.667l-115.228-83.333h25.765l89.463 64.7V250z" />
        <g fill="#fff">
          <path d="M299 352l4.2 13h13.7l-11 8.1 4.2 13-11.1-8-11 8 4.2-13-11-8.1h13.6z" />
          <path d="M398 390l3 9.3h9.8l-7.9 5.7 3 9.2-7.9-5.7-7.8 5.7 3-9.2-7.9-5.7h9.8z" />
          <path d="M398 290l3 9.2h9.8l-7.9 5.8 3 9.2-7.9-5.8-7.8 5.8 3-9.2-7.9-5.8h9.8z" />
          <path d="M454 340l3 9.2h9.8l-7.9 5.8 3 9.2-7.9-5.8-7.9 5.8 3-9.2-7.9-5.8h9.8z" />
          <path d="M510 390l3 9.3h9.7l-7.8 5.7 3 9.2-7.9-5.7-7.9 5.7 3-9.2-7.9-5.7H507z" />
          <path d="M437 442l2.3 7h7.4l-6 4.3 2.3 7-6-4.3-6 4.3 2.3-7-6-4.3h7.4z" />
        </g>
      </svg>
    ),
    PT: (
      <svg viewBox="0 0 640 480" className={className}>
        <path fill="#006600" d="M0 0h256v480H0z" />
        <path fill="#ff0000" d="M256 0h384v480H256z" />
        <circle cx="256" cy="240" r="80" fill="#ffcc00" />
        <circle cx="256" cy="240" r="60" fill="#ff0000" />
        <circle cx="256" cy="240" r="40" fill="#fff" />
      </svg>
    ),
    ES: (
      <svg viewBox="0 0 640 480" className={className}>
        <path fill="#c60b1e" d="M0 0h640v480H0z" />
        <path fill="#ffc400" d="M0 120h640v240H0z" />
      </svg>
    ),
    AE: (
      <svg viewBox="0 0 640 480" className={className}>
        <path fill="#00732f" d="M0 0h640v160H0z" />
        <path fill="#fff" d="M0 160h640v160H0z" />
        <path d="M0 320h640v160H0z" />
        <path fill="#ff0000" d="M0 0h180v480H0z" />
      </svg>
    ),
  }

  return flags[country] || (
    <svg viewBox="0 0 640 480" className={className}>
      <rect fill="#e5e7eb" width="640" height="480" />
      <text x="320" y="260" textAnchor="middle" fill="#6b7280" fontSize="120" fontFamily="Arial">{country}</text>
    </svg>
  )
}
