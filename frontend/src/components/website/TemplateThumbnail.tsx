interface TemplateThumbnailProps {
  pageType: string
  templateId: number
  primaryColor?: string
  accentColor?: string
}

// Mini HTML preview layouts for each template type
export default function TemplateThumbnail({
  pageType,
  templateId,
  primaryColor = '#1f2937',
  accentColor = '#3b82f6'
}: TemplateThumbnailProps) {
  // Get the preview component based on page type and template
  const Preview = getTemplatePreview(pageType, templateId)

  return (
    <div className="w-full aspect-[16/10] bg-white rounded border border-gray-200 overflow-hidden">
      <Preview primaryColor={primaryColor} accentColor={accentColor} />
    </div>
  )
}

interface PreviewProps {
  primaryColor: string
  accentColor: string
}

// ============================================
// HOME PAGE TEMPLATES
// ============================================

function HomeClassicPreview({ primaryColor, accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      {/* Full hero with overlay */}
      <div className="h-[45%] relative" style={{ backgroundColor: primaryColor }}>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="w-[60%] h-1 bg-white/80 rounded mb-1"></div>
          <div className="w-[40%] h-0.5 bg-white/50 rounded mb-2"></div>
          {/* Search form */}
          <div className="flex gap-0.5 bg-white/90 rounded px-1 py-0.5">
            <div className="w-3 h-1 bg-gray-200 rounded"></div>
            <div className="w-3 h-1 bg-gray-200 rounded"></div>
            <div className="w-2 h-1 rounded" style={{ backgroundColor: accentColor }}></div>
          </div>
        </div>
      </div>
      {/* 4-column features grid */}
      <div className="h-[20%] bg-gray-50 px-2 py-1 flex gap-1 items-center justify-center">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-1 flex flex-col items-center">
            <div className="w-2 h-2 rounded-full bg-gray-200 mb-0.5"></div>
            <div className="w-full h-0.5 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
      {/* 3-column room cards */}
      <div className="flex-1 px-2 py-1 flex gap-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 bg-gray-100 rounded overflow-hidden">
            <div className="h-[60%] bg-gray-200"></div>
            <div className="p-0.5">
              <div className="w-full h-0.5 bg-gray-300 rounded mb-0.5"></div>
              <div className="w-1/2 h-0.5 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
      {/* Dark CTA */}
      <div className="h-[15%] flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
        <div className="w-8 h-1 bg-white rounded"></div>
      </div>
    </div>
  )
}

function HomeModernPreview({ primaryColor, accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      {/* Split hero */}
      <div className="h-[40%] flex">
        <div className="w-1/2 p-2 flex flex-col justify-center" style={{ backgroundColor: primaryColor }}>
          <div className="w-[80%] h-1 bg-white/80 rounded mb-1"></div>
          <div className="w-[60%] h-0.5 bg-white/50 rounded mb-1.5"></div>
          <div className="w-6 h-1 rounded" style={{ backgroundColor: accentColor }}></div>
        </div>
        <div className="w-1/2 bg-gray-200"></div>
      </div>
      {/* 2-column features */}
      <div className="h-[25%] px-2 py-1 flex gap-2">
        <div className="flex-1 flex flex-col gap-0.5">
          {[1, 2].map((i) => (
            <div key={i} className="flex-1 bg-gray-50 rounded p-0.5 flex items-center gap-1">
              <div className="w-2 h-2 rounded bg-gray-200"></div>
              <div className="flex-1">
                <div className="w-full h-0.5 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex-1 flex flex-col gap-0.5">
          {[1, 2].map((i) => (
            <div key={i} className="flex-1 bg-gray-50 rounded p-0.5 flex items-center gap-1">
              <div className="w-2 h-2 rounded bg-gray-200"></div>
              <div className="flex-1">
                <div className="w-full h-0.5 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Large room cards with overlay */}
      <div className="flex-1 px-2 py-1 flex gap-1">
        {[1, 2].map((i) => (
          <div key={i} className="flex-1 bg-gray-200 rounded relative">
            <div className="absolute bottom-0 left-0 right-0 bg-black/40 p-0.5">
              <div className="w-[70%] h-0.5 bg-white rounded"></div>
            </div>
          </div>
        ))}
      </div>
      {/* Minimal CTA */}
      <div className="h-[10%] flex items-center justify-center bg-gray-50">
        <div className="w-6 h-1 rounded" style={{ backgroundColor: accentColor }}></div>
      </div>
    </div>
  )
}

function HomeMinimalPreview({ primaryColor, accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      {/* Compact hero with prominent search */}
      <div className="h-[30%] relative" style={{ backgroundColor: primaryColor }}>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="w-[50%] h-1 bg-white/80 rounded mb-1"></div>
          <div className="flex gap-0.5 bg-white rounded px-1.5 py-0.5">
            <div className="w-4 h-1 bg-gray-200 rounded"></div>
            <div className="w-4 h-1 bg-gray-200 rounded"></div>
            <div className="w-3 h-1 rounded" style={{ backgroundColor: accentColor }}></div>
          </div>
        </div>
      </div>
      {/* Horizontal icon bar */}
      <div className="h-[12%] bg-gray-50 px-2 flex items-center justify-center gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="w-2 h-2 rounded-full bg-gray-200"></div>
        ))}
      </div>
      {/* 2-column large room cards */}
      <div className="flex-1 px-2 py-1 flex gap-2">
        {[1, 2].map((i) => (
          <div key={i} className="flex-1 bg-gray-100 rounded overflow-hidden">
            <div className="h-[55%] bg-gray-200"></div>
            <div className="p-1">
              <div className="w-[80%] h-0.5 bg-gray-300 rounded mb-0.5"></div>
              <div className="w-[50%] h-0.5 bg-gray-200 rounded mb-1"></div>
              <div className="w-1/3 h-1 rounded" style={{ backgroundColor: accentColor }}></div>
            </div>
          </div>
        ))}
      </div>
      {/* Simple CTA */}
      <div className="h-[12%] flex items-center justify-center border-t border-gray-100">
        <div className="w-8 h-1 rounded" style={{ backgroundColor: primaryColor }}></div>
      </div>
    </div>
  )
}

function HomeShowcasePreview({ primaryColor, accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      {/* Hero carousel/slider */}
      <div className="h-[45%] relative bg-gray-200">
        {/* Navigation arrows */}
        <div className="absolute left-0.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
          <div className="w-0.5 h-0.5 border-l border-t border-white rotate-[-45deg]"></div>
        </div>
        {/* Slider dots */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
          <div className="w-1 h-1 rounded-full" style={{ backgroundColor: accentColor }}></div>
          <div className="w-1 h-1 rounded-full bg-white/50"></div>
          <div className="w-1 h-1 rounded-full bg-white/50"></div>
        </div>
        {/* Overlaid features */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 p-1">
          <div className="flex gap-1 justify-center">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-3 h-2 bg-white/30 rounded flex items-center justify-center">
                <div className="w-1.5 h-0.5 bg-white rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Masonry room grid */}
      <div className="flex-1 px-2 py-1 flex gap-1">
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex-1 bg-gray-100 rounded"></div>
          <div className="h-[45%] bg-gray-200 rounded"></div>
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <div className="h-[45%] bg-gray-200 rounded"></div>
          <div className="flex-1 bg-gray-100 rounded"></div>
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex-1 bg-gray-100 rounded"></div>
          <div className="h-[45%] bg-gray-200 rounded"></div>
        </div>
      </div>
      {/* Full-width CTA */}
      <div className="h-[15%] flex items-center justify-center" style={{ backgroundColor: accentColor }}>
        <div className="w-10 h-1 bg-white rounded"></div>
      </div>
    </div>
  )
}

// Home Template 5: Luxury (Dark theme with gold accents)
function HomeLuxuryPreview({ accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px] bg-gray-900">
      {/* Dark hero */}
      <div className="h-[45%] relative bg-black">
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="w-[50%] h-0.5 mb-1" style={{ backgroundColor: accentColor }}></div>
          <div className="w-[60%] h-1 bg-white/80 rounded mb-1"></div>
          <div className="w-[40%] h-0.5 bg-white/40 rounded mb-2"></div>
          <div className="w-8 h-1 rounded border" style={{ borderColor: accentColor }}></div>
        </div>
      </div>
      {/* Elegant features */}
      <div className="h-[20%] bg-gray-900 px-2 py-1 flex gap-2 items-center justify-center">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 flex flex-col items-center">
            <div className="w-2 h-2 rounded-full mb-0.5" style={{ backgroundColor: accentColor }}></div>
            <div className="w-full h-0.5 bg-white/30 rounded"></div>
          </div>
        ))}
      </div>
      {/* Dark room cards */}
      <div className="flex-1 px-2 py-1 flex gap-1">
        {[1, 2].map((i) => (
          <div key={i} className="flex-1 bg-gray-800 rounded overflow-hidden">
            <div className="h-[60%] bg-gray-700"></div>
            <div className="p-0.5">
              <div className="w-full h-0.5 bg-gray-500 rounded"></div>
            </div>
          </div>
        ))}
      </div>
      {/* Gold CTA */}
      <div className="h-[12%] flex items-center justify-center" style={{ backgroundColor: accentColor }}>
        <div className="w-8 h-1 bg-gray-900 rounded"></div>
      </div>
    </div>
  )
}

// Home Template 6: Nature (Organic, earthy)
function HomeNaturePreview({ primaryColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      {/* Full-bleed nature hero */}
      <div className="h-[50%] relative bg-green-800">
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="w-[55%] h-1 bg-white/90 rounded-full mb-1"></div>
          <div className="w-[35%] h-0.5 bg-white/60 rounded-full mb-2"></div>
          <div className="w-10 h-1 bg-amber-600 rounded-full"></div>
        </div>
      </div>
      {/* Organic section */}
      <div className="flex-1 p-2 bg-amber-50">
        <div className="grid grid-cols-3 gap-1 h-full">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg overflow-hidden shadow-sm">
              <div className="h-[50%] bg-green-200"></div>
              <div className="p-0.5">
                <div className="w-full h-0.5 bg-green-900/60 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Earth tone CTA */}
      <div className="h-[12%] flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
        <div className="w-8 h-1 bg-white rounded-full"></div>
      </div>
    </div>
  )
}

// Home Template 7: Urban (Geometric, bold)
function HomeUrbanPreview({ accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      {/* Geometric hero */}
      <div className="h-[45%] relative bg-gray-900">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gray-800" style={{ clipPath: 'polygon(30% 0, 100% 0, 100% 100%, 0% 100%)' }}></div>
        <div className="absolute inset-0 flex flex-col items-start justify-center pl-3">
          <div className="w-[50%] h-1 bg-white rounded mb-1"></div>
          <div className="w-[30%] h-0.5 bg-white/50 rounded mb-2"></div>
          <div className="w-8 h-1 rounded" style={{ backgroundColor: accentColor }}></div>
        </div>
      </div>
      {/* Bold grid */}
      <div className="flex-1 p-2 flex gap-1">
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex-1 bg-gray-100 rounded"></div>
          <div className="h-[40%] rounded" style={{ backgroundColor: accentColor }}></div>
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <div className="h-[60%] bg-gray-200 rounded"></div>
          <div className="flex-1 bg-gray-100 rounded"></div>
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <div className="h-[30%] bg-gray-300 rounded"></div>
          <div className="flex-1 bg-gray-100 rounded"></div>
        </div>
      </div>
      {/* Sharp CTA */}
      <div className="h-[12%] flex items-center justify-center bg-gray-900">
        <div className="w-10 h-1 rounded" style={{ backgroundColor: accentColor }}></div>
      </div>
    </div>
  )
}

// Home Template 8: Cozy (Warm, rounded)
function HomeCozyPreview({ accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px] bg-orange-50">
      {/* Warm hero */}
      <div className="h-[40%] m-1.5 rounded-2xl relative bg-orange-200">
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="w-[50%] h-1 bg-orange-900/80 rounded-full mb-1"></div>
          <div className="w-[35%] h-0.5 bg-orange-900/50 rounded-full mb-2"></div>
          <div className="w-8 h-1.5 rounded-full" style={{ backgroundColor: accentColor }}></div>
        </div>
      </div>
      {/* Friendly features */}
      <div className="px-2 py-1 flex gap-1.5 justify-center">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="w-5 h-5 bg-white rounded-xl shadow-sm flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-orange-300"></div>
          </div>
        ))}
      </div>
      {/* Rounded cards */}
      <div className="flex-1 px-2 py-1 flex gap-1.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 bg-white rounded-xl overflow-hidden shadow-sm">
            <div className="h-[55%] bg-orange-100"></div>
            <div className="p-0.5">
              <div className="w-full h-0.5 bg-orange-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
      {/* Warm CTA */}
      <div className="m-1.5 h-[10%] flex items-center justify-center bg-orange-400 rounded-xl">
        <div className="w-8 h-1 bg-white rounded-full"></div>
      </div>
    </div>
  )
}

// ============================================
// ACCOMMODATION PAGE TEMPLATES
// ============================================

function AccommodationGridPreview({ primaryColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      <div className="h-[20%] px-2 py-1 flex items-end" style={{ backgroundColor: primaryColor }}>
        <div className="w-10 h-1 bg-white/80 rounded"></div>
      </div>
      <div className="flex-1 p-2 grid grid-cols-3 gap-1">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-gray-100 rounded overflow-hidden">
            <div className="h-[55%] bg-gray-200"></div>
            <div className="p-0.5">
              <div className="w-full h-0.5 bg-gray-300 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AccommodationListPreview({ primaryColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      <div className="h-[15%] px-2 py-1 flex items-end" style={{ backgroundColor: primaryColor }}>
        <div className="w-10 h-1 bg-white/80 rounded"></div>
      </div>
      <div className="flex-1 p-2 flex flex-col gap-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-1 bg-gray-50 rounded overflow-hidden">
            <div className="w-1/3 bg-gray-200"></div>
            <div className="flex-1 p-0.5 flex flex-col justify-center">
              <div className="w-[80%] h-0.5 bg-gray-300 rounded mb-0.5"></div>
              <div className="w-[60%] h-0.5 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AccommodationShowcasePreview({ primaryColor, accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      <div className="h-[15%] px-2 py-1 flex items-end" style={{ backgroundColor: primaryColor }}>
        <div className="w-10 h-1 bg-white/80 rounded"></div>
      </div>
      <div className="flex-1 p-2 flex flex-col gap-1.5">
        {[1, 2].map((i) => (
          <div key={i} className="flex-1 bg-gray-100 rounded overflow-hidden relative">
            <div className="absolute inset-0 bg-gray-200"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent flex flex-col justify-end p-1">
              <div className="w-[60%] h-0.5 bg-white rounded mb-0.5"></div>
              <div className="w-4 h-1 rounded" style={{ backgroundColor: accentColor }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AccommodationMasonryPreview({ primaryColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      <div className="h-[15%] px-2 py-1 flex items-end" style={{ backgroundColor: primaryColor }}>
        <div className="w-10 h-1 bg-white/80 rounded"></div>
      </div>
      <div className="flex-1 p-2 flex gap-1">
        <div className="flex-1 flex flex-col gap-1">
          <div className="h-[60%] bg-gray-200 rounded"></div>
          <div className="flex-1 bg-gray-100 rounded"></div>
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <div className="h-[35%] bg-gray-100 rounded"></div>
          <div className="flex-1 bg-gray-200 rounded"></div>
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <div className="h-[50%] bg-gray-200 rounded"></div>
          <div className="flex-1 bg-gray-100 rounded"></div>
        </div>
      </div>
    </div>
  )
}

// Accommodation Template 5: Comparison
function AccommodationComparisonPreview({ primaryColor, accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      <div className="h-[15%] px-2 py-1 flex items-end" style={{ backgroundColor: primaryColor }}>
        <div className="w-10 h-1 bg-white/80 rounded"></div>
      </div>
      <div className="flex-1 p-2">
        {/* Comparison table */}
        <div className="h-full flex flex-col bg-gray-50 rounded overflow-hidden">
          <div className="flex border-b border-gray-200 p-0.5" style={{ backgroundColor: accentColor }}>
            <div className="w-1/4"></div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-1 text-center">
                <div className="w-full h-0.5 bg-white/80 rounded mx-auto"></div>
              </div>
            ))}
          </div>
          {[1, 2, 3, 4].map((row) => (
            <div key={row} className="flex border-b border-gray-100 p-0.5">
              <div className="w-1/4 flex items-center">
                <div className="w-full h-0.5 bg-gray-300 rounded"></div>
              </div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex-1 flex justify-center">
                  <div className="w-1 h-1 rounded-full bg-gray-200"></div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Accommodation Template 6: Minimal Cards
function AccommodationMinimalCardsPreview({ primaryColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      <div className="h-[15%] px-2 py-1 flex items-end" style={{ backgroundColor: primaryColor }}>
        <div className="w-10 h-1 bg-white/80 rounded"></div>
      </div>
      <div className="flex-1 p-2 grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="h-[55%] bg-gray-100"></div>
            <div className="p-1">
              <div className="w-[80%] h-0.5 bg-gray-400 rounded mb-0.5"></div>
              <div className="w-[50%] h-0.5 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Accommodation Template 7: Full Width
function AccommodationFullWidthPreview({ primaryColor, accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      <div className="h-[12%] px-2 py-1 flex items-end" style={{ backgroundColor: primaryColor }}>
        <div className="w-10 h-1 bg-white/80 rounded"></div>
      </div>
      <div className="flex-1 flex flex-col">
        {[1, 2].map((i) => (
          <div key={i} className="flex-1 bg-gray-200 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent flex items-center px-2">
              <div>
                <div className="w-10 h-0.5 bg-white rounded mb-0.5"></div>
                <div className="w-6 h-0.5 bg-white/60 rounded mb-1"></div>
                <div className="w-4 h-1 rounded" style={{ backgroundColor: accentColor }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Accommodation Template 8: Magazine
function AccommodationMagazinePreview({ primaryColor, accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      <div className="h-[12%] px-2 py-1 flex items-end" style={{ backgroundColor: primaryColor }}>
        <div className="w-10 h-1 bg-white/80 rounded"></div>
      </div>
      <div className="flex-1 p-2 flex gap-1">
        {/* Featured large */}
        <div className="flex-[2] bg-gray-200 rounded relative">
          <div className="absolute bottom-1 left-1 right-1 bg-white/90 rounded p-0.5">
            <div className="w-[80%] h-0.5 bg-gray-400 rounded mb-0.5"></div>
            <div className="w-4 h-1 rounded" style={{ backgroundColor: accentColor }}></div>
          </div>
        </div>
        {/* Side list */}
        <div className="flex-1 flex flex-col gap-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-1 bg-gray-100 rounded overflow-hidden flex">
              <div className="w-1/3 bg-gray-200"></div>
              <div className="flex-1 p-0.5 flex flex-col justify-center">
                <div className="w-full h-0.5 bg-gray-300 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================
// REVIEWS PAGE TEMPLATES
// ============================================

function ReviewsCarouselPreview({ primaryColor, accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      <div className="h-[25%] px-2 py-1 flex flex-col items-center justify-end" style={{ backgroundColor: primaryColor }}>
        <div className="w-8 h-1 bg-white/80 rounded mb-0.5"></div>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="w-1 h-1 rounded-full" style={{ backgroundColor: accentColor }}></div>
          ))}
        </div>
      </div>
      <div className="flex-1 p-2 flex items-center">
        <div className="w-2 h-2 bg-gray-200 rounded"></div>
        <div className="flex-1 mx-1 bg-gray-50 rounded p-1 h-[80%]">
          <div className="flex gap-0.5 mb-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-1 h-1 rounded-full" style={{ backgroundColor: accentColor }}></div>
            ))}
          </div>
          <div className="w-full h-0.5 bg-gray-200 rounded mb-0.5"></div>
          <div className="w-[80%] h-0.5 bg-gray-200 rounded"></div>
        </div>
        <div className="w-2 h-2 bg-gray-200 rounded"></div>
      </div>
      <div className="h-[20%] bg-gray-50 px-2 flex items-center justify-center gap-2">
        <div className="text-center">
          <div className="w-3 h-1 bg-gray-300 rounded mb-0.5 mx-auto"></div>
          <div className="w-2 h-0.5 bg-gray-200 rounded mx-auto"></div>
        </div>
        <div className="text-center">
          <div className="w-3 h-1 bg-gray-300 rounded mb-0.5 mx-auto"></div>
          <div className="w-2 h-0.5 bg-gray-200 rounded mx-auto"></div>
        </div>
      </div>
    </div>
  )
}

function ReviewsGridPreview({ primaryColor, accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      <div className="h-[20%] px-2 py-1 flex items-end" style={{ backgroundColor: primaryColor }}>
        <div className="w-8 h-1 bg-white/80 rounded"></div>
      </div>
      <div className="flex-1 p-2 grid grid-cols-3 gap-1">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-gray-50 rounded p-0.5">
            <div className="flex gap-0.5 mb-0.5">
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} className="w-0.5 h-0.5 rounded-full" style={{ backgroundColor: accentColor }}></div>
              ))}
            </div>
            <div className="w-full h-0.5 bg-gray-200 rounded mb-0.5"></div>
            <div className="w-[60%] h-0.5 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ReviewsTimelinePreview({ primaryColor, accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      <div className="h-[20%] px-2 py-1 flex items-end" style={{ backgroundColor: primaryColor }}>
        <div className="w-8 h-1 bg-white/80 rounded"></div>
      </div>
      <div className="flex-1 p-2 flex">
        <div className="w-0.5 mx-2 bg-gray-200 relative">
          {[20, 50, 80].map((top) => (
            <div key={top} className="absolute w-1.5 h-1.5 rounded-full -left-0.5" style={{ top: `${top}%`, backgroundColor: accentColor }}></div>
          ))}
        </div>
        <div className="flex-1 flex flex-col justify-around">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`bg-gray-50 rounded p-0.5 w-[85%] ${i % 2 === 0 ? 'self-end' : ''}`}>
              <div className="w-full h-0.5 bg-gray-200 rounded mb-0.5"></div>
              <div className="w-[60%] h-0.5 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ReviewsFeaturedPreview({ primaryColor, accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      <div className="h-[20%] px-2 py-1 flex items-end" style={{ backgroundColor: primaryColor }}>
        <div className="w-8 h-1 bg-white/80 rounded"></div>
      </div>
      <div className="flex-1 p-2 flex flex-col gap-1">
        {/* Featured review */}
        <div className="h-[45%] bg-gray-50 rounded p-1 flex gap-1">
          <div className="w-4 h-4 rounded-full bg-gray-200 flex-shrink-0"></div>
          <div className="flex-1">
            <div className="flex gap-0.5 mb-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-1 h-1 rounded-full" style={{ backgroundColor: accentColor }}></div>
              ))}
            </div>
            <div className="w-full h-0.5 bg-gray-300 rounded mb-0.5"></div>
            <div className="w-[80%] h-0.5 bg-gray-200 rounded"></div>
          </div>
        </div>
        {/* Grid of others */}
        <div className="flex-1 grid grid-cols-3 gap-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-50 rounded p-0.5">
              <div className="w-full h-0.5 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Reviews Template 5: Masonry
function ReviewsMasonryPreview({ primaryColor, accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      <div className="h-[15%] px-2 py-1 flex items-end" style={{ backgroundColor: primaryColor }}>
        <div className="w-8 h-1 bg-white/80 rounded"></div>
      </div>
      <div className="flex-1 p-2 flex gap-1">
        <div className="flex-1 flex flex-col gap-1">
          <div className="h-[55%] bg-gray-50 rounded p-0.5">
            <div className="flex gap-0.5 mb-0.5">
              {[1,2,3,4,5].map((i) => <div key={i} className="w-0.5 h-0.5 rounded-full" style={{ backgroundColor: accentColor }}></div>)}
            </div>
            <div className="w-full h-0.5 bg-gray-200 rounded"></div>
          </div>
          <div className="flex-1 bg-gray-50 rounded p-0.5"></div>
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <div className="h-[35%] bg-gray-50 rounded p-0.5"></div>
          <div className="flex-1 bg-gray-50 rounded p-0.5"></div>
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <div className="h-[45%] bg-gray-50 rounded p-0.5"></div>
          <div className="flex-1 bg-gray-50 rounded p-0.5"></div>
        </div>
      </div>
    </div>
  )
}

// Reviews Template 6: Social
function ReviewsSocialPreview({ primaryColor, accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      <div className="h-[15%] px-2 py-1 flex items-end" style={{ backgroundColor: primaryColor }}>
        <div className="w-8 h-1 bg-white/80 rounded"></div>
      </div>
      <div className="flex-1 p-2 grid grid-cols-2 gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-100 p-1">
            <div className="flex items-center gap-1 mb-1">
              <div className="w-2 h-2 rounded-full bg-gray-200"></div>
              <div className="flex-1">
                <div className="w-full h-0.5 bg-gray-300 rounded"></div>
              </div>
            </div>
            <div className="flex gap-0.5 mb-0.5">
              {[1,2,3,4,5].map((j) => <div key={j} className="w-0.5 h-0.5 rounded-full" style={{ backgroundColor: accentColor }}></div>)}
            </div>
            <div className="w-full h-0.5 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Reviews Template 7: Minimal
function ReviewsMinimalPreview({ primaryColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      <div className="h-[15%] px-2 py-1 flex items-end" style={{ backgroundColor: primaryColor }}>
        <div className="w-8 h-1 bg-white/80 rounded"></div>
      </div>
      <div className="flex-1 p-3 flex flex-col gap-2 max-w-[80%] mx-auto w-full">
        {[1, 2, 3].map((i) => (
          <div key={i} className="text-center border-b border-gray-100 pb-1">
            <div className="w-[90%] h-0.5 bg-gray-300 rounded mx-auto mb-0.5"></div>
            <div className="w-[60%] h-0.5 bg-gray-200 rounded mx-auto mb-0.5"></div>
            <div className="w-[40%] h-0.5 bg-gray-200 rounded mx-auto"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Reviews Template 8: Video
function ReviewsVideoPreview({ primaryColor, accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      <div className="h-[15%] px-2 py-1 flex items-end" style={{ backgroundColor: primaryColor }}>
        <div className="w-8 h-1 bg-white/80 rounded"></div>
      </div>
      {/* Video section */}
      <div className="h-[40%] p-2 flex gap-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 bg-gray-200 rounded relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-white/80 flex items-center justify-center">
                <div className="w-0 h-0 border-t-[2px] border-t-transparent border-b-[2px] border-b-transparent border-l-[3px]" style={{ borderLeftColor: accentColor }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Text reviews */}
      <div className="flex-1 p-2 grid grid-cols-3 gap-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-50 rounded p-0.5">
            <div className="w-full h-0.5 bg-gray-200 rounded mb-0.5"></div>
            <div className="w-[60%] h-0.5 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// CONTACT PAGE TEMPLATES
// ============================================

function ContactStandardPreview({ primaryColor, accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      <div className="h-[20%] px-2 py-1 flex items-end" style={{ backgroundColor: primaryColor }}>
        <div className="w-8 h-1 bg-white/80 rounded"></div>
      </div>
      <div className="flex-1 p-2 flex gap-2">
        {/* Form */}
        <div className="flex-1 flex flex-col gap-0.5">
          <div className="w-full h-1 bg-gray-100 rounded"></div>
          <div className="w-full h-1 bg-gray-100 rounded"></div>
          <div className="w-full h-3 bg-gray-100 rounded"></div>
          <div className="w-6 h-1 rounded mt-0.5" style={{ backgroundColor: accentColor }}></div>
        </div>
        {/* Info sidebar */}
        <div className="w-1/3 flex flex-col gap-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-50 rounded p-0.5 flex items-center gap-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-200"></div>
              <div className="w-full h-0.5 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ContactMapFocusPreview({ primaryColor, accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      {/* Map header */}
      <div className="h-[45%] bg-gray-200 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }}></div>
        </div>
      </div>
      {/* Form below */}
      <div className="flex-1 p-2 flex flex-col gap-0.5">
        <div className="w-8 h-1 rounded mb-1" style={{ backgroundColor: primaryColor }}></div>
        <div className="w-full h-1 bg-gray-100 rounded"></div>
        <div className="w-full h-1 bg-gray-100 rounded"></div>
        <div className="w-full h-2 bg-gray-100 rounded"></div>
        <div className="w-6 h-1 rounded mt-0.5" style={{ backgroundColor: accentColor }}></div>
      </div>
    </div>
  )
}

function ContactCardStylePreview({ primaryColor, accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px] bg-gray-50">
      <div className="h-[15%] px-2 py-1 flex items-end" style={{ backgroundColor: primaryColor }}>
        <div className="w-8 h-1 bg-white/80 rounded"></div>
      </div>
      <div className="flex-1 p-2 flex flex-col items-center justify-center">
        {/* Centered card */}
        <div className="w-[80%] bg-white rounded p-1.5 shadow-sm">
          <div className="flex flex-col gap-0.5 mb-1">
            <div className="w-full h-1 bg-gray-100 rounded"></div>
            <div className="w-full h-1 bg-gray-100 rounded"></div>
            <div className="w-full h-2 bg-gray-100 rounded"></div>
          </div>
          <div className="w-6 h-1 rounded mx-auto" style={{ backgroundColor: accentColor }}></div>
        </div>
        {/* Info icons below */}
        <div className="flex gap-2 mt-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-gray-200"></div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ContactSplitScreenPreview({ primaryColor, accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex text-[4px]">
      {/* Image side */}
      <div className="w-1/2 bg-gray-200"></div>
      {/* Form side */}
      <div className="w-1/2 p-2 flex flex-col">
        <div className="w-6 h-1 rounded mb-2" style={{ backgroundColor: primaryColor }}></div>
        <div className="flex flex-col gap-0.5 flex-1">
          <div className="w-full h-1 bg-gray-100 rounded"></div>
          <div className="w-full h-1 bg-gray-100 rounded"></div>
          <div className="w-full h-3 bg-gray-100 rounded"></div>
          <div className="w-6 h-1 rounded mt-auto" style={{ backgroundColor: accentColor }}></div>
        </div>
      </div>
    </div>
  )
}

// Contact Template 5: Minimal
function ContactMinimalPreview({ primaryColor, accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      <div className="h-[15%] px-2 py-1 flex items-end" style={{ backgroundColor: primaryColor }}>
        <div className="w-8 h-1 bg-white/80 rounded"></div>
      </div>
      <div className="flex-1 flex items-center justify-center p-2">
        <div className="w-[60%] flex flex-col gap-0.5">
          <div className="w-full h-1 bg-gray-100 rounded"></div>
          <div className="w-full h-1 bg-gray-100 rounded"></div>
          <div className="w-full h-2 bg-gray-100 rounded"></div>
          <div className="w-8 h-1 rounded mx-auto mt-1" style={{ backgroundColor: accentColor }}></div>
        </div>
      </div>
    </div>
  )
}

// Contact Template 6: Chat Style
function ContactChatStylePreview({ primaryColor, accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      <div className="h-[15%] px-2 py-1 flex items-end" style={{ backgroundColor: primaryColor }}>
        <div className="w-8 h-1 bg-white/80 rounded"></div>
      </div>
      <div className="flex-1 p-2 flex flex-col gap-1">
        <div className="self-start bg-gray-100 rounded-lg rounded-tl-none p-1 w-[60%]">
          <div className="w-full h-0.5 bg-gray-300 rounded"></div>
        </div>
        <div className="self-end rounded-lg rounded-tr-none p-1 w-[60%]" style={{ backgroundColor: accentColor }}>
          <div className="w-full h-0.5 bg-white/70 rounded"></div>
        </div>
        <div className="self-start bg-gray-100 rounded-lg rounded-tl-none p-1 w-[50%]">
          <div className="w-full h-0.5 bg-gray-300 rounded"></div>
        </div>
        <div className="mt-auto flex gap-1">
          <div className="flex-1 h-1.5 bg-gray-100 rounded"></div>
          <div className="w-4 h-1.5 rounded" style={{ backgroundColor: accentColor }}></div>
        </div>
      </div>
    </div>
  )
}

// Contact Template 7: Multi-Column
function ContactMultiColumnPreview({ primaryColor, accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      <div className="h-[15%] px-2 py-1 flex items-end" style={{ backgroundColor: primaryColor }}>
        <div className="w-8 h-1 bg-white/80 rounded"></div>
      </div>
      <div className="flex-1 p-2 grid grid-cols-3 gap-1">
        {['Sales', 'Support', 'General'].map((dept) => (
          <div key={dept} className="bg-gray-50 rounded p-1 flex flex-col">
            <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: accentColor }}></div>
            <div className="w-[80%] h-0.5 bg-gray-300 rounded mx-auto mb-0.5"></div>
            <div className="w-[60%] h-0.5 bg-gray-200 rounded mx-auto mb-1"></div>
            <div className="w-full h-1 bg-gray-100 rounded mb-0.5"></div>
            <div className="w-full h-2 bg-gray-100 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Contact Template 8: Hero Contact
function ContactHeroPreview({ accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      <div className="flex-1 relative bg-gray-300">
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="absolute inset-0 flex items-center justify-center p-2">
          <div className="bg-white rounded-lg p-1.5 w-[70%] shadow-lg">
            <div className="w-8 h-0.5 bg-gray-400 rounded mb-1 mx-auto"></div>
            <div className="flex flex-col gap-0.5">
              <div className="w-full h-1 bg-gray-100 rounded"></div>
              <div className="w-full h-1 bg-gray-100 rounded"></div>
              <div className="w-full h-2 bg-gray-100 rounded"></div>
            </div>
            <div className="w-full h-1 rounded mt-1" style={{ backgroundColor: accentColor }}></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// BLOG PAGE TEMPLATES
// ============================================

function BlogClassicPreview({ primaryColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      <div className="h-[15%] px-2 py-1 flex items-end" style={{ backgroundColor: primaryColor }}>
        <div className="w-6 h-1 bg-white/80 rounded"></div>
      </div>
      <div className="flex-1 p-2 flex gap-2">
        {/* Posts list */}
        <div className="flex-[2] flex flex-col gap-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-1 bg-gray-50 rounded overflow-hidden">
              <div className="w-1/4 bg-gray-200"></div>
              <div className="flex-1 p-0.5">
                <div className="w-[80%] h-0.5 bg-gray-300 rounded mb-0.5"></div>
                <div className="w-full h-0.5 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
        {/* Sidebar */}
        <div className="flex-1 flex flex-col gap-1">
          <div className="bg-gray-50 rounded p-0.5">
            <div className="w-full h-0.5 bg-gray-300 rounded mb-0.5"></div>
            <div className="w-[80%] h-0.5 bg-gray-200 rounded"></div>
          </div>
          <div className="bg-gray-50 rounded p-0.5">
            <div className="w-full h-0.5 bg-gray-300 rounded mb-0.5"></div>
            <div className="flex gap-0.5 flex-wrap">
              <div className="w-2 h-0.5 bg-gray-200 rounded"></div>
              <div className="w-3 h-0.5 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BlogMagazinePreview({ primaryColor, accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      <div className="h-[15%] px-2 py-1 flex items-end" style={{ backgroundColor: primaryColor }}>
        <div className="w-6 h-1 bg-white/80 rounded"></div>
      </div>
      {/* Featured post hero */}
      <div className="h-[35%] m-2 mb-1 bg-gray-200 rounded relative">
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 p-1">
          <div className="w-[60%] h-0.5 bg-white rounded mb-0.5"></div>
          <div className="w-4 h-0.5 rounded" style={{ backgroundColor: accentColor }}></div>
        </div>
      </div>
      {/* Grid below */}
      <div className="flex-1 px-2 pb-2 grid grid-cols-3 gap-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-100 rounded overflow-hidden">
            <div className="h-[50%] bg-gray-200"></div>
            <div className="p-0.5">
              <div className="w-full h-0.5 bg-gray-300 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BlogMinimalPreview({ primaryColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      <div className="h-[15%] px-2 py-1 flex items-end" style={{ backgroundColor: primaryColor }}>
        <div className="w-6 h-1 bg-white/80 rounded"></div>
      </div>
      <div className="flex-1 p-2 flex flex-col gap-1 max-w-[70%] mx-auto w-full">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border-b border-gray-100 pb-1">
            <div className="w-[80%] h-0.5 bg-gray-300 rounded mb-0.5"></div>
            <div className="flex gap-1">
              <div className="w-3 h-0.5 bg-gray-200 rounded"></div>
              <div className="w-4 h-0.5 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BlogCardsPreview({ primaryColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      <div className="h-[15%] px-2 py-1 flex items-end" style={{ backgroundColor: primaryColor }}>
        <div className="w-6 h-1 bg-white/80 rounded"></div>
      </div>
      <div className="flex-1 p-2 grid grid-cols-3 gap-1">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded overflow-hidden shadow-sm border border-gray-100">
            <div className="h-[50%] bg-gray-200"></div>
            <div className="p-0.5">
              <div className="w-full h-0.5 bg-gray-300 rounded mb-0.5"></div>
              <div className="w-[60%] h-0.5 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Blog Template 5: Masonry
function BlogMasonryPreview({ primaryColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      <div className="h-[15%] px-2 py-1 flex items-end" style={{ backgroundColor: primaryColor }}>
        <div className="w-6 h-1 bg-white/80 rounded"></div>
      </div>
      <div className="flex-1 p-2 flex gap-1">
        <div className="flex-1 flex flex-col gap-1">
          <div className="h-[60%] bg-gray-100 rounded overflow-hidden">
            <div className="h-[60%] bg-gray-200"></div>
          </div>
          <div className="flex-1 bg-gray-100 rounded"></div>
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <div className="h-[40%] bg-gray-100 rounded"></div>
          <div className="flex-1 bg-gray-100 rounded overflow-hidden">
            <div className="h-[50%] bg-gray-200"></div>
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <div className="h-[50%] bg-gray-100 rounded overflow-hidden">
            <div className="h-[55%] bg-gray-200"></div>
          </div>
          <div className="flex-1 bg-gray-100 rounded"></div>
        </div>
      </div>
    </div>
  )
}

// Blog Template 6: Timeline
function BlogTimelinePreview({ primaryColor, accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      <div className="h-[15%] px-2 py-1 flex items-end" style={{ backgroundColor: primaryColor }}>
        <div className="w-6 h-1 bg-white/80 rounded"></div>
      </div>
      <div className="flex-1 p-2 flex">
        <div className="w-0.5 mx-2 bg-gray-200 relative">
          {[15, 40, 65, 90].map((top) => (
            <div key={top} className="absolute w-1.5 h-1.5 rounded-full -left-0.5" style={{ top: `${top}%`, backgroundColor: accentColor }}></div>
          ))}
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-50 rounded p-0.5 flex gap-1">
              <div className="w-1/4 bg-gray-200 rounded"></div>
              <div className="flex-1">
                <div className="w-full h-0.5 bg-gray-300 rounded mb-0.5"></div>
                <div className="w-[60%] h-0.5 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Blog Template 7: Featured Grid
function BlogFeaturedGridPreview({ primaryColor, accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      <div className="h-[15%] px-2 py-1 flex items-end" style={{ backgroundColor: primaryColor }}>
        <div className="w-6 h-1 bg-white/80 rounded"></div>
      </div>
      <div className="flex-1 p-2 flex gap-1">
        {/* Large featured */}
        <div className="flex-[2] bg-gray-200 rounded relative">
          <div className="absolute bottom-1 left-1 right-1 bg-white/90 rounded p-0.5">
            <div className="w-[80%] h-0.5 bg-gray-400 rounded mb-0.5"></div>
            <div className="w-4 h-0.5 rounded" style={{ backgroundColor: accentColor }}></div>
          </div>
        </div>
        {/* 2x2 grid */}
        <div className="flex-1 grid grid-cols-2 gap-0.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-100 rounded overflow-hidden">
              <div className="h-[60%] bg-gray-200"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Blog Template 8: List Compact
function BlogListCompactPreview({ primaryColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      <div className="h-[15%] px-2 py-1 flex items-end" style={{ backgroundColor: primaryColor }}>
        <div className="w-6 h-1 bg-white/80 rounded"></div>
      </div>
      <div className="flex-1 p-2 flex flex-col gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-1 items-center border-b border-gray-100 pb-1">
            <div className="w-4 h-3 bg-gray-200 rounded flex-shrink-0"></div>
            <div className="flex-1">
              <div className="w-[90%] h-0.5 bg-gray-300 rounded mb-0.5"></div>
              <div className="w-[60%] h-0.5 bg-gray-200 rounded"></div>
            </div>
            <div className="w-3 h-0.5 bg-gray-200 rounded flex-shrink-0"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// BOOK PAGE TEMPLATES
// ============================================

function BookWizardPreview({ primaryColor, accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      <div className="h-[15%] px-2 py-1 flex items-end" style={{ backgroundColor: primaryColor }}>
        <div className="w-8 h-1 bg-white/80 rounded"></div>
      </div>
      {/* Progress indicator */}
      <div className="h-[10%] px-2 flex items-center justify-center gap-1">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }}></div>
        <div className="w-4 h-0.5 bg-gray-200"></div>
        <div className="w-2 h-2 rounded-full bg-gray-200"></div>
        <div className="w-4 h-0.5 bg-gray-200"></div>
        <div className="w-2 h-2 rounded-full bg-gray-200"></div>
      </div>
      {/* Form step */}
      <div className="flex-1 p-2 flex flex-col items-center">
        <div className="w-[70%] bg-gray-50 rounded p-1.5">
          <div className="w-6 h-1 bg-gray-300 rounded mb-1"></div>
          <div className="flex flex-col gap-0.5 mb-1">
            <div className="w-full h-1 bg-gray-100 rounded"></div>
            <div className="w-full h-1 bg-gray-100 rounded"></div>
          </div>
          <div className="flex justify-end">
            <div className="w-6 h-1 rounded" style={{ backgroundColor: accentColor }}></div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BookSinglePagePreview({ primaryColor, accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      <div className="h-[15%] px-2 py-1 flex items-end" style={{ backgroundColor: primaryColor }}>
        <div className="w-8 h-1 bg-white/80 rounded"></div>
      </div>
      <div className="flex-1 p-2 flex flex-col gap-1">
        {/* Accordion sections */}
        {['Room', 'Guest', 'Payment'].map((section, i) => (
          <div key={section} className="bg-gray-50 rounded p-0.5">
            <div className="flex justify-between items-center">
              <div className="w-4 h-0.5 bg-gray-300 rounded"></div>
              <div className="w-1 h-1 bg-gray-200 rounded"></div>
            </div>
            {i === 0 && (
              <div className="mt-0.5 flex gap-0.5">
                <div className="w-full h-1 bg-gray-100 rounded"></div>
                <div className="w-full h-1 bg-gray-100 rounded"></div>
              </div>
            )}
          </div>
        ))}
        <div className="w-6 h-1 rounded mt-auto mx-auto" style={{ backgroundColor: accentColor }}></div>
      </div>
    </div>
  )
}

function BookCompactPreview({ primaryColor, accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      <div className="h-[15%] px-2 py-1 flex items-end" style={{ backgroundColor: primaryColor }}>
        <div className="w-8 h-1 bg-white/80 rounded"></div>
      </div>
      <div className="flex-1 p-2 flex items-center justify-center">
        <div className="w-[60%] bg-gray-50 rounded p-1.5">
          <div className="grid grid-cols-2 gap-0.5 mb-1">
            <div className="h-1 bg-gray-100 rounded"></div>
            <div className="h-1 bg-gray-100 rounded"></div>
            <div className="h-1 bg-gray-100 rounded"></div>
            <div className="h-1 bg-gray-100 rounded"></div>
          </div>
          <div className="w-full h-1 rounded" style={{ backgroundColor: accentColor }}></div>
        </div>
      </div>
    </div>
  )
}

function BookSplitPreview({ primaryColor, accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex text-[4px]">
      {/* Room preview */}
      <div className="w-[45%] bg-gray-200 relative">
        <div className="absolute bottom-1 left-1 right-1 bg-white/90 rounded p-0.5">
          <div className="w-[80%] h-0.5 bg-gray-300 rounded mb-0.5"></div>
          <div className="w-4 h-0.5 bg-gray-200 rounded"></div>
        </div>
      </div>
      {/* Form */}
      <div className="flex-1 p-2 flex flex-col">
        <div className="w-6 h-1 rounded mb-1" style={{ backgroundColor: primaryColor }}></div>
        <div className="flex flex-col gap-0.5 flex-1">
          <div className="w-full h-1 bg-gray-100 rounded"></div>
          <div className="w-full h-1 bg-gray-100 rounded"></div>
          <div className="w-full h-1 bg-gray-100 rounded"></div>
          <div className="w-full h-1 bg-gray-100 rounded"></div>
          <div className="w-full h-1 rounded mt-auto" style={{ backgroundColor: accentColor }}></div>
        </div>
      </div>
    </div>
  )
}

// Book Template 5: Calendar Focus
function BookCalendarFocusPreview({ primaryColor, accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      <div className="h-[15%] px-2 py-1 flex items-end" style={{ backgroundColor: primaryColor }}>
        <div className="w-8 h-1 bg-white/80 rounded"></div>
      </div>
      <div className="flex-1 p-2 flex gap-2">
        {/* Large calendar */}
        <div className="flex-[2] bg-gray-50 rounded p-1">
          <div className="grid grid-cols-7 gap-0.5 mb-0.5">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-0.5 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {[...Array(35)].map((_, i) => (
              <div key={i} className={`h-1.5 rounded ${i === 15 || i === 16 ? '' : 'bg-gray-100'}`} style={i === 15 || i === 16 ? { backgroundColor: accentColor } : {}}></div>
            ))}
          </div>
        </div>
        {/* Sidebar form */}
        <div className="flex-1 flex flex-col gap-0.5">
          <div className="h-1 bg-gray-100 rounded"></div>
          <div className="h-1 bg-gray-100 rounded"></div>
          <div className="flex-1"></div>
          <div className="h-1 rounded" style={{ backgroundColor: accentColor }}></div>
        </div>
      </div>
    </div>
  )
}

// Book Template 6: Card Steps
function BookCardStepsPreview({ primaryColor, accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      <div className="h-[15%] px-2 py-1 flex items-end" style={{ backgroundColor: primaryColor }}>
        <div className="w-8 h-1 bg-white/80 rounded"></div>
      </div>
      <div className="flex-1 p-2">
        <div className="flex justify-center gap-1 mb-2">
          {[1, 2, 3].map((step) => (
            <div key={step} className={`w-4 h-4 rounded-lg flex items-center justify-center ${step === 1 ? '' : 'bg-gray-100'}`} style={step === 1 ? { backgroundColor: accentColor } : {}}>
              <div className={`w-1.5 h-1.5 rounded-full ${step === 1 ? 'bg-white' : 'bg-gray-300'}`}></div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-1.5 w-[80%] mx-auto">
          <div className="w-6 h-0.5 bg-gray-300 rounded mb-1"></div>
          <div className="flex flex-col gap-0.5">
            <div className="h-1 bg-gray-100 rounded"></div>
            <div className="h-1 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Book Template 7: Floating
function BookFloatingPreview({ accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      <div className="flex-1 relative bg-gray-300">
        <div className="absolute inset-0 bg-black/30"></div>
        <div className="absolute inset-0 flex items-center justify-center p-2">
          <div className="bg-white rounded-lg shadow-lg p-1.5 w-[65%]">
            <div className="w-8 h-0.5 bg-gray-400 rounded mb-1 mx-auto"></div>
            <div className="grid grid-cols-2 gap-0.5 mb-1">
              <div className="h-1 bg-gray-100 rounded"></div>
              <div className="h-1 bg-gray-100 rounded"></div>
              <div className="h-1 bg-gray-100 rounded"></div>
              <div className="h-1 bg-gray-100 rounded"></div>
            </div>
            <div className="w-full h-1 rounded" style={{ backgroundColor: accentColor }}></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Book Template 8: Timeline
function BookTimelinePreview({ primaryColor, accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      <div className="h-[15%] px-2 py-1 flex items-end" style={{ backgroundColor: primaryColor }}>
        <div className="w-8 h-1 bg-white/80 rounded"></div>
      </div>
      <div className="flex-1 p-2">
        <div className="flex flex-col gap-1">
          {['Select Room', 'Guest Info', 'Payment'].map((step, i) => (
            <div key={step} className="flex gap-1 items-start">
              <div className="flex flex-col items-center">
                <div className={`w-2 h-2 rounded-full ${i === 0 ? '' : 'bg-gray-200'}`} style={i === 0 ? { backgroundColor: accentColor } : {}}></div>
                {i < 2 && <div className="w-0.5 h-3 bg-gray-200"></div>}
              </div>
              <div className={`flex-1 rounded p-0.5 ${i === 0 ? 'bg-gray-50' : ''}`}>
                <div className="w-[60%] h-0.5 bg-gray-300 rounded mb-0.5"></div>
                {i === 0 && (
                  <div className="flex gap-0.5">
                    <div className="flex-1 h-1 bg-gray-100 rounded"></div>
                    <div className="flex-1 h-1 bg-gray-100 rounded"></div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================
// ROOM DETAIL TEMPLATES
// ============================================

function RoomGalleryPreview({ primaryColor, accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      {/* Gallery header */}
      <div className="h-[40%] flex gap-0.5 p-1">
        <div className="flex-[2] bg-gray-200 rounded"></div>
        <div className="flex-1 flex flex-col gap-0.5">
          <div className="flex-1 bg-gray-200 rounded"></div>
          <div className="flex-1 bg-gray-200 rounded"></div>
        </div>
      </div>
      {/* Details below */}
      <div className="flex-1 p-2 flex gap-2">
        <div className="flex-[2] flex flex-col gap-1">
          <div className="w-10 h-1 rounded" style={{ backgroundColor: primaryColor }}></div>
          <div className="w-full h-0.5 bg-gray-200 rounded"></div>
          <div className="w-[80%] h-0.5 bg-gray-200 rounded"></div>
        </div>
        <div className="flex-1 bg-gray-50 rounded p-1">
          <div className="w-full h-1 bg-gray-200 rounded mb-0.5"></div>
          <div className="w-full h-1 rounded" style={{ backgroundColor: accentColor }}></div>
        </div>
      </div>
    </div>
  )
}

function RoomImmersivePreview({ accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      {/* Full-width images */}
      <div className="h-[50%] bg-gray-200 relative">
        {/* Floating booking card */}
        <div className="absolute bottom-1 right-1 w-8 bg-white rounded p-0.5 shadow-sm">
          <div className="w-full h-0.5 bg-gray-300 rounded mb-0.5"></div>
          <div className="w-full h-1 rounded" style={{ backgroundColor: accentColor }}></div>
        </div>
      </div>
      <div className="flex-1 p-2">
        <div className="w-10 h-1 bg-gray-300 rounded mb-1"></div>
        <div className="grid grid-cols-4 gap-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-50 rounded p-0.5 flex flex-col items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-200 mb-0.5"></div>
              <div className="w-full h-0.5 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function RoomSplitViewPreview({ primaryColor, accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex text-[4px]">
      {/* Gallery side */}
      <div className="w-1/2 p-1 flex flex-col gap-0.5">
        <div className="flex-1 bg-gray-200 rounded"></div>
        <div className="flex gap-0.5">
          <div className="flex-1 h-3 bg-gray-200 rounded"></div>
          <div className="flex-1 h-3 bg-gray-200 rounded"></div>
          <div className="flex-1 h-3 bg-gray-200 rounded"></div>
        </div>
      </div>
      {/* Details side */}
      <div className="w-1/2 p-1.5 flex flex-col">
        <div className="w-10 h-1 rounded mb-1" style={{ backgroundColor: primaryColor }}></div>
        <div className="w-full h-0.5 bg-gray-200 rounded mb-0.5"></div>
        <div className="w-[80%] h-0.5 bg-gray-200 rounded mb-2"></div>
        <div className="grid grid-cols-2 gap-0.5 mb-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-1 bg-gray-100 rounded"></div>
          ))}
        </div>
        <div className="mt-auto w-full h-1 rounded" style={{ backgroundColor: accentColor }}></div>
      </div>
    </div>
  )
}

function RoomTabbedPreview({ primaryColor, accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      <div className="h-[15%] px-2 py-1 flex items-end" style={{ backgroundColor: primaryColor }}>
        <div className="w-8 h-1 bg-white/80 rounded"></div>
      </div>
      {/* Tabs */}
      <div className="h-[10%] px-2 flex items-center gap-1 border-b border-gray-100">
        <div className="w-4 h-0.5 rounded" style={{ backgroundColor: accentColor }}></div>
        <div className="w-4 h-0.5 bg-gray-200 rounded"></div>
        <div className="w-4 h-0.5 bg-gray-200 rounded"></div>
        <div className="w-4 h-0.5 bg-gray-200 rounded"></div>
      </div>
      {/* Tab content */}
      <div className="flex-1 p-2 flex gap-2">
        <div className="flex-[2] bg-gray-100 rounded"></div>
        <div className="flex-1 flex flex-col gap-0.5">
          <div className="h-2 bg-gray-50 rounded"></div>
          <div className="h-2 bg-gray-50 rounded"></div>
          <div className="h-2 bg-gray-50 rounded"></div>
        </div>
      </div>
    </div>
  )
}

// Room Detail Template 5: Carousel Hero
function RoomCarouselHeroPreview({ accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      {/* Full-screen carousel */}
      <div className="h-[55%] bg-gray-200 relative">
        {/* Navigation arrows */}
        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/80 flex items-center justify-center">
          <div className="w-0.5 h-0.5 border-l border-t border-gray-400 rotate-[-45deg]"></div>
        </div>
        <div className="absolute right-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/80 flex items-center justify-center">
          <div className="w-0.5 h-0.5 border-r border-t border-gray-400 rotate-[45deg]"></div>
        </div>
        {/* Overlay content */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 p-2">
          <div className="w-10 h-1 bg-white rounded mb-1"></div>
          <div className="flex gap-1">
            <div className="w-6 h-1 rounded" style={{ backgroundColor: accentColor }}></div>
            <div className="w-4 h-1 rounded bg-white/30"></div>
          </div>
        </div>
        {/* Dots */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
          <div className="w-1 h-1 rounded-full" style={{ backgroundColor: accentColor }}></div>
          <div className="w-1 h-1 rounded-full bg-white/50"></div>
          <div className="w-1 h-1 rounded-full bg-white/50"></div>
        </div>
      </div>
      {/* Details */}
      <div className="flex-1 p-2 flex gap-2">
        <div className="flex-1">
          <div className="w-full h-0.5 bg-gray-200 rounded mb-0.5"></div>
          <div className="w-[60%] h-0.5 bg-gray-200 rounded"></div>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-0.5">
          {[1,2,3,4].map((i) => (
            <div key={i} className="bg-gray-100 rounded p-0.5 flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-gray-300"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Room Detail Template 6: Grid Gallery
function RoomGridGalleryPreview({ primaryColor, accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      <div className="h-[12%] px-2 py-1 flex items-end" style={{ backgroundColor: primaryColor }}>
        <div className="w-8 h-1 bg-white/80 rounded"></div>
      </div>
      {/* Instagram-style grid */}
      <div className="h-[40%] p-1 grid grid-cols-4 grid-rows-2 gap-0.5">
        <div className="col-span-2 row-span-2 bg-gray-200 rounded"></div>
        <div className="bg-gray-200 rounded"></div>
        <div className="bg-gray-200 rounded"></div>
        <div className="bg-gray-200 rounded"></div>
        <div className="bg-gray-200 rounded relative">
          <div className="absolute inset-0 bg-black/40 rounded flex items-center justify-center">
            <div className="text-white text-[3px]">+5</div>
          </div>
        </div>
      </div>
      {/* Details */}
      <div className="flex-1 p-2 flex gap-2">
        <div className="flex-[2] flex flex-col gap-1">
          <div className="w-10 h-0.5 bg-gray-300 rounded"></div>
          <div className="w-full h-0.5 bg-gray-200 rounded"></div>
          <div className="w-[80%] h-0.5 bg-gray-200 rounded"></div>
        </div>
        <div className="flex-1 bg-gray-50 rounded p-1 flex flex-col">
          <div className="w-full h-0.5 bg-gray-300 rounded mb-1"></div>
          <div className="mt-auto w-full h-1 rounded" style={{ backgroundColor: accentColor }}></div>
        </div>
      </div>
    </div>
  )
}

// Room Detail Template 7: Minimalist
function RoomMinimalistPreview({ primaryColor, accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px] bg-gray-50">
      {/* Single clean image */}
      <div className="h-[45%] m-2 mb-1 bg-gray-200 rounded-lg"></div>
      {/* Centered minimal content */}
      <div className="flex-1 p-2 flex flex-col items-center text-center">
        <div className="w-12 h-1 rounded mb-1" style={{ backgroundColor: primaryColor }}></div>
        <div className="w-[60%] h-0.5 bg-gray-300 rounded mb-0.5"></div>
        <div className="w-[40%] h-0.5 bg-gray-200 rounded mb-2"></div>
        {/* Features in a row */}
        <div className="flex gap-2 mb-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-2 h-2 rounded-full bg-gray-200 mb-0.5"></div>
              <div className="w-3 h-0.5 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
        <div className="w-10 h-1.5 rounded mt-auto" style={{ backgroundColor: accentColor }}></div>
      </div>
    </div>
  )
}

// Room Detail Template 8: Magazine
function RoomMagazinePreview({ primaryColor, accentColor }: PreviewProps) {
  return (
    <div className="w-full h-full flex flex-col text-[4px]">
      {/* Editorial header */}
      <div className="h-[50%] flex">
        <div className="w-[55%] bg-gray-200"></div>
        <div className="flex-1 p-2 flex flex-col justify-center" style={{ backgroundColor: primaryColor }}>
          <div className="w-[80%] h-1 bg-white rounded mb-1"></div>
          <div className="w-full h-0.5 bg-white/60 rounded mb-0.5"></div>
          <div className="w-[60%] h-0.5 bg-white/40 rounded mb-2"></div>
          <div className="w-8 h-1 rounded" style={{ backgroundColor: accentColor }}></div>
        </div>
      </div>
      {/* Large typography section */}
      <div className="flex-1 p-2">
        <div className="flex gap-2">
          <div className="flex-1">
            <div className="w-full h-0.5 bg-gray-300 rounded mb-0.5"></div>
            <div className="w-full h-0.5 bg-gray-200 rounded mb-0.5"></div>
            <div className="w-[70%] h-0.5 bg-gray-200 rounded"></div>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-0.5">
            <div className="bg-gray-100 rounded h-4"></div>
            <div className="bg-gray-100 rounded h-4"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// TEMPLATE MAPPING
// ============================================

function getTemplatePreview(pageType: string, templateId: number): React.FC<PreviewProps> {
  const templates: Record<string, Record<number, React.FC<PreviewProps>>> = {
    home: {
      1: HomeClassicPreview,
      2: HomeModernPreview,
      3: HomeMinimalPreview,
      4: HomeShowcasePreview,
      5: HomeLuxuryPreview,
      6: HomeNaturePreview,
      7: HomeUrbanPreview,
      8: HomeCozyPreview,
    },
    accommodation: {
      1: AccommodationGridPreview,
      2: AccommodationListPreview,
      3: AccommodationShowcasePreview,
      4: AccommodationMasonryPreview,
      5: AccommodationComparisonPreview,
      6: AccommodationMinimalCardsPreview,
      7: AccommodationFullWidthPreview,
      8: AccommodationMagazinePreview,
    },
    reviews: {
      1: ReviewsCarouselPreview,
      2: ReviewsGridPreview,
      3: ReviewsTimelinePreview,
      4: ReviewsFeaturedPreview,
      5: ReviewsMasonryPreview,
      6: ReviewsSocialPreview,
      7: ReviewsMinimalPreview,
      8: ReviewsVideoPreview,
    },
    contact: {
      1: ContactStandardPreview,
      2: ContactMapFocusPreview,
      3: ContactCardStylePreview,
      4: ContactSplitScreenPreview,
      5: ContactMinimalPreview,
      6: ContactChatStylePreview,
      7: ContactMultiColumnPreview,
      8: ContactHeroPreview,
    },
    blog: {
      1: BlogClassicPreview,
      2: BlogMagazinePreview,
      3: BlogMinimalPreview,
      4: BlogCardsPreview,
      5: BlogMasonryPreview,
      6: BlogTimelinePreview,
      7: BlogFeaturedGridPreview,
      8: BlogListCompactPreview,
    },
    book: {
      1: BookWizardPreview,
      2: BookSinglePagePreview,
      3: BookCompactPreview,
      4: BookSplitPreview,
      5: BookCalendarFocusPreview,
      6: BookCardStepsPreview,
      7: BookFloatingPreview,
      8: BookTimelinePreview,
    },
    room_detail: {
      1: RoomGalleryPreview,
      2: RoomImmersivePreview,
      3: RoomSplitViewPreview,
      4: RoomTabbedPreview,
      5: RoomCarouselHeroPreview,
      6: RoomGridGalleryPreview,
      7: RoomMinimalistPreview,
      8: RoomMagazinePreview,
    },
  }

  const pageTemplates = templates[pageType] || templates.home
  return pageTemplates[templateId] || pageTemplates[1]
}
