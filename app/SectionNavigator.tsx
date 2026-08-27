"use client";

import { useEffect, useState } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

const DEFAULT_SECTION_LABELS = [
  "Welcome",
  "Recent hits",
  "Find the signal",
  "Current projects",
  "Building in public",
];

function getSections() {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-page-section]"));
}

export function SectionNavigator() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const sectionLabels = DEFAULT_SECTION_LABELS;

  useEffect(() => {
    const sections = getSections();

    let frame = 0;
    const updateCurrentSection = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const marker = Math.max(92, window.innerHeight * 0.34);
        let nextIndex = 0;
        sections.forEach((section, index) => {
          if (section.getBoundingClientRect().top <= marker) nextIndex = index;
        });
        setCurrentIndex(nextIndex);
      });
    };

    updateCurrentSection();
    window.addEventListener("scroll", updateCurrentSection, { passive: true });
    window.addEventListener("resize", updateCurrentSection);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateCurrentSection);
      window.removeEventListener("resize", updateCurrentSection);
    };
  }, []);

  const move = (direction: -1 | 1) => {
    const sections = getSections();
    const targetIndex = Math.max(0, Math.min(currentIndex + direction, sections.length - 1));
    const target = sections[targetIndex];
    if (!target || targetIndex === currentIndex) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      || window.localStorage.getItem("basedcode-motion") === "off";
    target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    setCurrentIndex(targetIndex);
  };

  const total = sectionLabels.length;
  const previousLabel = sectionLabels[currentIndex - 1];
  const nextLabel = sectionLabels[currentIndex + 1];

  return (
    <nav className="section-navigator" aria-label="Page section navigation">
      <span className="section-navigator-count" aria-hidden="true">
        {String(currentIndex + 1).padStart(2, "0")} / {String(total || 1).padStart(2, "0")}
      </span>
      <button
        type="button"
        onClick={() => move(-1)}
        disabled={currentIndex === 0}
        aria-label={previousLabel ? `Previous section: ${previousLabel}` : "No previous section"}
        title={previousLabel ? `Previous: ${previousLabel}` : "Beginning of page"}
      >
        <FiChevronUp aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => move(1)}
        disabled={total === 0 || currentIndex >= total - 1}
        aria-label={nextLabel ? `Next section: ${nextLabel}` : "No next section"}
        title={nextLabel ? `Next: ${nextLabel}` : "End of page"}
      >
        <FiChevronDown aria-hidden="true" />
      </button>
      <span className="section-navigator-status" aria-live="polite">
        {sectionLabels[currentIndex] ?? "Page section"}
      </span>
    </nav>
  );
}
