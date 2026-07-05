/**
 * Custom bottom-nav / navigation glyphs.
 *
 * SINGLE SOURCE OF TRUTH: edit an SVG here and every place that imports it
 * (mobile bottom nav, mobile drawer, desktop header, PDP top bar, account
 * sidebar, …) updates automatically. To swap a glyph, replace the
 * `<path>` / `<rect>` markup inside the matching component below — keep
 * `stroke="currentColor"` / `fill="currentColor"` so the icon keeps inheriting
 * the active/inactive colour from its parent, and keep `viewBox="0 0 512 512"`
 * (the coordinate space the artwork is drawn in).
 *
 * BOLDNESS: the raw art is drawn with hairline strokes that render too light at
 * nav sizes, and it mixes filled glyphs (home/cart) with outline glyphs. These
 * two knobs make the whole set read at a matching weight — bump them together
 * to go heavier/lighter (values are in the 512-unit viewBox, ≈ ÷23 for px at
 * the 22px nav size):
 *   - STROKE     — line weight for the OUTLINE glyphs (categories, bell, account).
 *   - FILL_BOLD  — extra outline added to the FILLED line-art glyphs (home, cart)
 *                  so their thin strokes fatten to roughly match STROKE.
 *
 * Each component mirrors the lucide API just enough to be a drop-in swap:
 * pass `className` (e.g. `size-[22px] text-primary`) to size and colour it.
 */
import * as React from "react";

const STROKE = 32;
const FILL_BOLD = 12;

type IconProps = React.SVGProps<SVGSVGElement>;

/** Shared wrapper: sane defaults + lets `className` size/colour the glyph. */
function Svg({ className, children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 512 512"
      width={24}
      height={24}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {children}
    </svg>
  );
}

/**
 * Props applied to the FILLED line-art glyphs (home, cart): keeps the fill but
 * adds a matching outline so the thin strokes read boldly at small sizes.
 */
const boldFill = {
  fill: "currentColor",
  stroke: "currentColor",
  strokeWidth: FILL_BOLD,
  strokeLinejoin: "round",
  strokeLinecap: "round",
} as const;

/** House — used wherever the "Home" icon appears. (fi_9643115) */
export function HomeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M202.667 373.333C196.776 373.333 192 378.11 192 384C192 389.89 196.776 394.666 202.667 394.666H309.333C315.223 394.666 320 389.89 320 384C320 378.11 315.223 373.333 309.333 373.333H202.667Z"
        {...boldFill}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M302.267 54.9361C275.14 33.52 236.859 33.52 209.732 54.9361L71.0658 164.41C53.1302 178.57 42.666 200.163 42.666 223.014V394.666C42.666 435.904 76.0954 469.333 117.333 469.333H394.666C435.903 469.333 469.333 435.904 469.333 394.666V223.014C469.333 200.163 458.869 178.57 440.934 164.41L302.267 54.9361ZM222.952 71.6802C242.329 56.3829 269.67 56.3829 289.047 71.6802L427.714 181.154C440.524 191.268 447.999 206.692 447.999 223.014V394.666C447.999 424.121 424.121 448 394.666 448H117.333C87.8775 448 63.9993 424.121 63.9993 394.666V223.014C63.9993 206.692 71.4737 191.268 84.285 181.154L222.952 71.6802Z"
        {...boldFill}
      />
    </Svg>
  );
}

/** 3 squares + 1 circle grid — used wherever the "Categories" icon appears. (fi_3405828) */
export function CategoriesIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="59" y="58" width="171" height="172" rx="38" stroke="currentColor" strokeWidth={STROKE} />
      <rect x="282" y="58" width="171" height="172" rx="38" stroke="currentColor" strokeWidth={STROKE} />
      <rect x="59" y="282" width="171" height="172" rx="38" stroke="currentColor" strokeWidth={STROKE} />
      <rect x="282" y="282" width="171" height="172" rx="85.5" stroke="currentColor" strokeWidth={STROKE} />
    </Svg>
  );
}

/** Shopping cart — used wherever the "Cart" icon appears. (fi_6737614) */
export function CartIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M136.587 322.105H428.555C447.909 322.105 464.627 308.973 469.211 290.169L511.709 115.803C512.582 112.225 511.763 108.445 509.487 105.548C507.212 102.652 503.733 100.961 500.05 100.961H108.852L91.9612 30.0301C90.6742 24.6241 85.8442 20.8101 80.2872 20.8101H30.0512C23.4242 20.8101 18.0512 26.1831 18.0512 32.8101C18.0512 39.4371 23.4242 44.8101 30.0512 44.8101H70.8102L84.1812 100.962H11.9492C5.32122 100.962 -0.0507812 106.335 -0.0507812 112.962C-0.0507812 119.589 5.32122 124.962 11.9492 124.962H484.774L445.893 284.485C443.907 292.631 436.939 298.105 428.554 298.105H136.587C111.027 298.105 90.2332 318.899 90.2332 344.459C90.2332 370.02 111.027 390.814 136.587 390.814H140.928C122.173 398.75 108.98 417.338 108.98 438.95C108.98 467.755 132.415 491.189 161.219 491.189C190.023 491.189 213.457 467.755 213.457 438.95C213.457 417.338 200.265 398.75 181.51 390.814H411.536C392.781 398.75 379.588 417.338 379.588 438.95C379.588 467.755 403.023 491.189 431.827 491.189C460.631 491.189 484.066 467.755 484.066 438.95C484.066 417.338 470.873 398.75 452.118 390.814H469.272C475.9 390.814 481.272 385.441 481.272 378.814C481.272 372.187 475.9 366.814 469.272 366.814H136.587C124.261 366.814 114.233 356.786 114.233 344.459C114.233 332.134 124.261 322.105 136.587 322.105ZM161.22 467.19C145.649 467.19 132.981 454.522 132.981 438.951C132.981 423.38 145.649 410.712 161.22 410.712C176.79 410.712 189.458 423.38 189.458 438.951C189.458 454.522 176.79 467.19 161.22 467.19ZM431.828 467.19C416.257 467.19 403.589 454.522 403.589 438.951C403.589 423.38 416.257 410.712 431.828 410.712C447.399 410.712 460.067 423.38 460.067 438.951C460.067 454.522 447.399 467.19 431.828 467.19ZM85.3602 190.676C78.7332 190.676 73.3602 185.303 73.3602 178.676C73.3602 172.049 78.7332 166.676 85.3602 166.676H231.932C238.559 166.676 243.932 172.049 243.932 178.676C243.932 185.303 238.559 190.676 231.932 190.676H85.3602ZM165.469 256.391H20.1682C13.5412 256.391 8.16822 251.018 8.16822 244.391C8.16822 237.764 13.5412 232.391 20.1682 232.391H165.469C172.096 232.391 177.469 237.764 177.469 244.391C177.469 251.018 172.096 256.391 165.469 256.391Z"
        {...boldFill}
      />
    </Svg>
  );
}

/** Bell — used wherever the "Alerts / notifications" icon appears. (fi_7531649) */
export function BellIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M256.003 32C277.076 32.0002 297.752 48.8751 305.6 77.4668L306.135 79.417L307.386 81.0059C308.338 82.2151 309.514 83.2747 310.884 84.1035L311.412 84.4229L311.977 84.6748C334.677 94.836 351.494 108.373 363.884 125.998L363.889 126.005C380.741 149.932 389.761 182.512 389.761 223.517C389.761 264.851 393.096 290.947 399.672 310.675C406.327 330.638 416.119 343.414 427.079 357.838L427.088 357.849C427.74 358.705 428.603 359.848 429.483 361.012L431.977 364.3C435.127 368.444 437.182 373.571 437.803 379.088C438.424 384.61 437.57 390.186 435.386 395.132L435.383 395.14L435.379 395.147C430.717 405.751 421.153 412 410.372 412H101.742C90.8645 412 81.2399 405.716 76.6074 395.098L76.6016 395.084L76.5947 395.069C74.4197 390.124 73.5746 384.553 74.2012 379.038C74.8277 373.524 76.8866 368.401 80.041 364.263L80.0957 364.19C81.7206 362.018 83.3158 359.932 84.9277 357.816L84.9297 357.813C95.9037 343.402 105.698 330.633 112.352 310.666C118.925 290.938 122.254 264.833 122.254 223.483C122.254 187.486 128.885 158.625 141.688 135.99C154.415 113.489 173.623 96.4564 200.051 84.6201L200.622 84.3643L201.158 84.0381C202.455 83.2497 203.581 82.2557 204.509 81.123L205.853 79.4824L206.415 77.4365C214.263 48.8757 234.929 32 256.003 32Z"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <path
        d="M215.416 465.5C203.591 465.5 194.004 471.097 194.004 478C194.004 484.903 203.591 490.5 215.416 490.5H296.592C308.417 490.5 318.004 484.903 318.004 478C318.004 471.097 308.417 465.5 296.592 465.5H215.416Z"
        {...boldFill}
      />
    </Svg>
  );
}

/** Person — used wherever the "Account / user" icon appears. (fi_10628940) */
export function AccountIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M69 433.333C69 365.707 124.04 310.667 191.667 310.667H319.667C387.293 310.667 442.333 365.707 442.333 433.333"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="163" y="88" width="176" height="175" rx="60" stroke="currentColor" strokeWidth={STROKE} />
    </Svg>
  );
}
