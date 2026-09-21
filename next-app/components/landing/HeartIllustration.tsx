"use client";

import { useId } from "react";

type HeartIllustrationProps = {
  layer: "surface" | "flow" | "interior";
  className?: string;
};

/** Decorative, stylised preview. The practical supplies the anatomical teaching model. */
export function HeartIllustration({ layer, className }: HeartIllustrationProps) {
  const prefix = `heart-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const paint = (name: string) => `url(#${prefix}-${name})`;

  return (
    <svg
      className={className}
      viewBox="0 0 480 480"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <radialGradient id={`${prefix}-halo`}>
          <stop stopColor="#68DCA9" stopOpacity=".12" />
          <stop offset="1" stopColor="#68DCA9" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${prefix}-tissue`} cx=".32" cy=".25" r=".85">
          <stop stopColor="#E98C81" />
          <stop offset=".38" stopColor="#C86A66" />
          <stop offset=".7" stopColor="#9F464D" />
          <stop offset="1" stopColor="#4F2639" />
        </radialGradient>
        <linearGradient id={`${prefix}-ventricle`} x1="228" y1="178" x2="330" y2="426" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E99A86" />
          <stop offset=".44" stopColor="#C7706B" />
          <stop offset="1" stopColor="#703347" />
        </linearGradient>
        <linearGradient id={`${prefix}-right`} x1="132" y1="212" x2="269" y2="360" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C87577" />
          <stop offset=".55" stopColor="#AC5F68" />
          <stop offset="1" stopColor="#794355" />
        </linearGradient>
        <linearGradient id={`${prefix}-aorta`} x1="208" y1="66" x2="267" y2="201" gradientUnits="userSpaceOnUse">
          <stop stopColor="#DE8C80" />
          <stop offset=".48" stopColor="#BC625F" />
          <stop offset="1" stopColor="#7A3C49" />
        </linearGradient>
        <linearGradient id={`${prefix}-vein`} x1="139" y1="101" x2="298" y2="225" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A0A1BD" />
          <stop offset=".4" stopColor="#747E9E" />
          <stop offset="1" stopColor="#454D72" />
        </linearGradient>
        <linearGradient id={`${prefix}-pulmonary`} x1="231" y1="182" x2="355" y2="141" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9E9ABD" />
          <stop offset=".55" stopColor="#747EA4" />
          <stop offset="1" stopColor="#464F76" />
        </linearGradient>
        <linearGradient id={`${prefix}-coronary`} x1="212" y1="210" x2="280" y2="422" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F3C5A2" />
          <stop offset="1" stopColor="#D58F81" />
        </linearGradient>
        <linearGradient id={`${prefix}-chamber`} x1="162" y1="249" x2="308" y2="386" gradientUnits="userSpaceOnUse">
          <stop stopColor="#372E48" />
          <stop offset="1" stopColor="#291F34" />
        </linearGradient>
        <filter id={`${prefix}-shadow`} x="-35%" y="-25%" width="170%" height="175%">
          <feDropShadow dx="0" dy="22" stdDeviation="19" floodColor="#000C08" floodOpacity=".6" />
        </filter>
        <marker id={`${prefix}-mint-arrow`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M1 1 9 5 1 9" stroke="#A5F2CD" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
        <marker id={`${prefix}-blue-arrow`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M1 1 9 5 1 9" stroke="#B6C9F4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>

      <ellipse cx="244" cy="271" rx="222" ry="205" fill={paint("halo")} />
      <g stroke="#7BCBA7" strokeWidth=".65" opacity=".17">
        <ellipse cx="244" cy="264" rx="195" ry="169" strokeDasharray="2 7" />
        <path d="M51 267h28m332 0h25M244 68v19m0 352v18M104 125l13 13m274 257 13 13M389 117l-13 13M99 400l13-13" />
        <circle cx="244" cy="264" r="141" strokeDasharray="1 8" />
      </g>

      <g filter={paint("shadow")}>
        {/* Posterior vessels establish the depth behind the atria. */}
        <path d="M164 212c-16-27-15-58-12-93l34-4c-3 36-1 57 13 79Z" fill={paint("vein")} stroke="#BBB5D3" strokeOpacity=".32" />
        <ellipse cx="169" cy="117" rx="18" ry="7" transform="rotate(-7 169 117)" fill="#343B5B" stroke="#A8A4C3" strokeWidth="3" />
        <path d="M154 124c-1 27-3 46 5 64" stroke="#D6CADB" strokeWidth="3" strokeLinecap="round" opacity=".22" />
        <path d="m177 320-5 48 25 4 5-52" fill={paint("vein")} />
        <path d="M293 184c27-10 41-8 57-5l-2 21c-21-5-35-1-50 6Z" fill={paint("aorta")} stroke="#EAAC9A" strokeOpacity=".26" />
        <ellipse cx="350" cy="190" rx="5" ry="11" fill="#633143" stroke="#CE8D88" strokeWidth="2" />
        <path d="M291 213c22-5 39-2 57 4l-8 19c-21-9-34-7-46-3Z" fill={paint("aorta")} />
        <ellipse cx="344" cy="227" rx="5" ry="10" transform="rotate(23 344 227)" fill="#633143" stroke="#CE8D88" strokeWidth="2" />

        {/* Aortic arch and its three small superior branches. */}
        <path d="M208 178c-5-22-5-51 5-71 12-24 37-29 58-15 19 13 26 34 30 57l-28 10c-2-23-6-36-17-41-10-4-17 2-18 13-2 17 4 34 9 45Z" fill={paint("aorta")} stroke="#F0B09A" strokeOpacity=".32" strokeWidth="1.2" />
        <path d="m220 98-8-35 17-4 9 32m5-5 1-38 17 1-1 39m11 9 12-30 16 8-13 33" fill={paint("aorta")} stroke="#E5A296" strokeOpacity=".42" strokeWidth="1.2" />
        <ellipse cx="220" cy="61" rx="9" ry="3.5" transform="rotate(-13 220 61)" fill="#743B4C" stroke="#DF9C8E" strokeWidth="2" />
        <ellipse cx="252" cy="49" rx="8.5" ry="3" transform="rotate(3 252 49)" fill="#743B4C" stroke="#DF9C8E" strokeWidth="2" />
        <ellipse cx="291" cy="71" rx="9" ry="3.5" transform="rotate(24 291 71)" fill="#743B4C" stroke="#DF9C8E" strokeWidth="2" />
        <path d="M216 152c-4-31 6-53 23-56 22-4 38 10 43 30" stroke="#F6C0A8" strokeWidth="3" strokeLinecap="round" opacity=".35" />

        {/* The asymmetric ventricular silhouette ends in an oblique apex. */}
        <path d="M189 170c-31-9-63 12-74 44-12 34-4 70 19 102 35 49 87 89 147 117 11 5 22-2 26-12 18-41 44-83 53-127 8-41-2-80-27-100-29-24-59-21-82-15-20 5-41-8-62-9Z" fill={paint("tissue")} stroke="#D69A8D" strokeOpacity=".25" strokeWidth="1.3" />
        <path d="M235 217c-15 33-7 66 11 102 15 31 26 65 43 110 12 3 16-4 20-16 18-43 42-81 49-119 7-37-1-68-23-91-22-24-66-10-100 14Z" fill={paint("ventricle")} />
        <path d="M155 206c-35 9-36 48-18 80 18 32 50 63 87 87 18 11 37 23 48 26-19-33-27-63-32-100-4-31-2-57-18-80-15-20-45-22-67-13Z" fill={paint("right")} />

        {/* Atrial auricles sit over the bases of the great vessels. */}
        <path d="M188 168c-20-20-47-10-51 12-3 16 5 29 18 43 9 10 20 16 32 12l24-31c-3-18-7-29-23-36Z" fill={paint("right")} stroke="#DBA3A0" strokeOpacity=".28" />
        <path d="M157 177c-13 15-9 26 4 42m8-48c-8 16-4 28 7 37" stroke="#EEB6A8" strokeWidth="1.2" strokeLinecap="round" opacity=".2" />
        <path d="M291 168c26-7 48 9 47 34-1 12-8 20-16 28-6-17-16-27-34-29-17-3-20-13-13-22 4-6 8-9 16-11Z" fill={paint("tissue")} stroke="#EDB6A0" strokeOpacity=".36" />
        <path d="M304 175c15 4 25 15 24 28m-37-23c14 1 23 9 27 17" stroke="#F2BCAA" strokeWidth="1.2" strokeLinecap="round" opacity=".25" />

        {/* Pulmonary trunk crosses in front of the aortic root. */}
        <path d="M210 223c-9-28-3-54 14-68 16-14 37-15 61-12l52-14 9 25-59 17c-18-4-32-4-42 5-10 10-7 23-1 36Z" fill={paint("pulmonary")} stroke="#C5C1DA" strokeOpacity=".36" strokeWidth="1.2" />
        <path d="M260 146c-26-18-47-17-72-13l-1 24c22-4 36-2 48 7" fill={paint("vein")} />
        <ellipse cx="188" cy="145" rx="6" ry="12" fill="#3A4161" stroke="#A4A4C0" strokeWidth="2" />
        <ellipse cx="341" cy="141" rx="6" ry="13" transform="rotate(-21 341 141)" fill="#3A4161" stroke="#9EABC8" strokeWidth="2" />
        <path d="M220 199c-3-25 11-42 31-44 12-2 24 1 33 0l44-12" stroke="#D2CFE4" strokeWidth="3" strokeLinecap="round" opacity=".28" />
        <path d="M237 217c-10 24-8 59 4 90 16 44 34 79 49 115" stroke="#693749" strokeWidth="9" strokeLinecap="round" opacity=".45" />

        {/* Fine contour lines give the surface a quiet scientific texture. */}
        <g stroke="#FFE1C3" strokeWidth=".8" opacity={layer === "surface" ? ".16" : ".08"}>
          <path d="M273 220c31-1 55 15 65 37M266 240c30 1 55 17 68 39M264 261c26 5 48 19 62 38M266 285c22 7 41 19 51 34M273 313c15 6 27 16 35 26M279 337c10 5 17 11 22 19" />
          <path d="M278 209c-6 29-2 52 9 75 13 27 17 54 12 84M300 212c-3 26 4 47 15 70 7 16 10 31 9 40M319 222c2 20 9 35 17 49" />
          <path d="M139 252c21 3 49 24 66 52M146 276c22 5 40 20 57 42M163 300c18 6 30 17 43 34M167 231c16 20 22 45 22 62M191 234c12 23 17 48 17 70" />
        </g>

        <g opacity={layer === "interior" ? ".2" : "1"} strokeLinecap="round" strokeLinejoin="round">
          <path d="M237 217c-5 26-3 55 7 80 10 26 18 53 33 84l12 39M234 232c-33-9-62-5-91-17m98 25c28-25 57-25 89-10" stroke="#784454" strokeWidth="6" opacity=".42" />
          <path d="M237 217c-5 26-3 55 7 80 10 26 18 53 33 84l12 39M234 232c-33-9-62-5-91-17m98 25c28-25 57-25 89-10" stroke={paint("coronary")} strokeWidth="2.8" />
          <path d="m238 268 32-6 35 10m-61 24 25 7 22 20m-36-2 24 14 15 19m-65-105-26 11-20 22m53 4-20 14-7 25m35-7-12 11-1 20m-24-115-16 16-3 20m-25-35-14 13-1 15m145-30 4 23 13 12m-39-35 3 22 12 16" stroke={paint("coronary")} strokeWidth="1.5" />
          <path d="m270 262 14-12 14 1m-26 51 9-10m-71-28-15-3m90 74 11-1m-102-86-15-1m116 8 12-4m-85 60-12-2" stroke="#E5A596" strokeWidth=".9" />
          <path d="M232 241c-5 24 0 48 10 73 9 22 18 51 29 75" stroke="#8395BE" strokeWidth="1.5" opacity=".75" />
        </g>

        {layer === "interior" && (
          <g strokeLinecap="round" strokeLinejoin="round">
            <path d="M282 224c25-4 47 14 51 42 6 42-19 85-37 119-10-30-21-54-28-80-9-32-7-62 14-81Z" fill={paint("chamber")} stroke="#EEB69C" strokeWidth="8" />
            <path d="M161 239c14-10 38-7 50 7 10 13 10 32 16 55l21 57c-35-22-64-51-81-80-10-17-15-30-6-39Z" fill={paint("chamber")} stroke="#D59B93" strokeWidth="5" />
            <path d="m278 262 17 12 19-13m-23 11-4 30m12-29 9 33m-21-4-9 29m30-25 4 22m-125-68 16 10 12-9m-14 10 2 23m-2-22-11 26" stroke="#EDC6AC" strokeWidth="1.6" />
            <path d="M279 245c9-9 25-9 35 0m-39 99 15 23m25-63-14 35m-126-63 21 18m6 12 17 18" stroke="#BC7E7E" strokeWidth="3" opacity=".65" />
            <path d="M276 237c11-9 24-7 36 0m-143 11c12-6 26-2 32 6" stroke="#A5F2CD" strokeWidth="2" />
          </g>
        )}

        {layer === "flow" && (
          <g strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M169 134c-1 28 4 43 15 58" stroke="#B6C9F4" strokeDasharray="3 7" markerEnd={paint("blue-arrow")} />
            <path d="M173 240c5 31 30 59 45 79 9-25 4-47 5-65" stroke="#B6C9F4" strokeDasharray="3 7" markerEnd={paint("blue-arrow")} />
            <path d="M224 202c-6-33 14-50 41-46l61-12" stroke="#B6C9F4" strokeDasharray="3 7" markerEnd={paint("blue-arrow")} />
            <path d="M329 192c-14-4-25 1-32 13" stroke="#A5F2CD" strokeDasharray="3 7" markerEnd={paint("mint-arrow")} />
            <path d="M305 254c10 40-4 73-13 94-15-36-29-68-29-89" stroke="#A5F2CD" strokeDasharray="3 7" markerEnd={paint("mint-arrow")} />
            <path d="M231 126c3-26 27-25 39-8l10 23" stroke="#A5F2CD" strokeDasharray="3 7" markerEnd={paint("mint-arrow")} />
          </g>
        )}

        <path d="M124 235c-5 21 0 42 13 63M282 414l9 6c5-2 8-8 11-14" stroke="#F7C5AA" strokeWidth="2" strokeLinecap="round" opacity=".35" />
      </g>

      <g stroke="#A5E5C7" fill="#0A1C14" strokeWidth="1.1">
        <circle cx="293" cy="304" r="4" />
        <circle cx="255" cy="95" r="3" />
        <circle cx="174" cy="199" r="3" />
      </g>
    </svg>
  );
}
