const Kalshi = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 153 153"
    fill="none"
    width="1em"
    height="1em"
    {...props}
  >
    <g
      stroke="currentColor"
      strokeWidth={7}
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {/* center square — where the four petal tips meet */}
      <path d="M63 63 H90 V90 H63 Z" />
      {/* top-right petal */}
      <path d="M90 63 Q129.1 52.1 140 13 Q100.9 23.9 90 63 Z" />
      {/* top-left petal */}
      <path d="M63 63 Q23.9 52.1 13 13 Q52.1 23.9 63 63 Z" />
      {/* bottom-left petal */}
      <path d="M63 90 Q23.9 100.9 13 140 Q52.1 129.1 63 90 Z" />
      {/* bottom-right petal */}
      <path d="M90 90 Q129.1 100.9 140 140 Q100.9 129.1 90 90 Z" />
    </g>
  </svg>
);
export default Kalshi;
