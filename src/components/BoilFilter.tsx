/**
 * A single shared SVG turbulence filter that "boils" a playing pause icon —
 * its animated noise seed wobbles the icon's edges for a gentle wavy, alive
 * motion that reads as "it's playing". Mounted once at the app root and
 * referenced from CSS as `filter: url(#pause-boil)` by both the player bar and
 * the in-page track rows. Disabled via prefers-reduced-motion in each consumer.
 */
export default function BoilFilter() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      style={{ position: "absolute", width: 0, height: 0 }}
    >
      <filter id="pause-boil" x="-30%" y="-30%" width="160%" height="160%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.018 0.03"
          numOctaves={1}
          result="noise"
          seed={1}
        >
          <animate
            attributeName="seed"
            values="1;8;1"
            dur="1.6s"
            repeatCount="indefinite"
          />
        </feTurbulence>
        <feDisplacementMap
          in="SourceGraphic"
          in2="noise"
          scale={1.6}
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  );
}
