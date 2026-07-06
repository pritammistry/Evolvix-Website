import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";

export function TestimonialsCarousel({ testimonials }) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef(null);
  const count = testimonials.length;

  const startTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setCurrent((c) => (c + 1) % count), 5000);
  }, [count]);

  useEffect(() => {
    startTimer();
    return () => clearInterval(timerRef.current);
  }, [startTimer]);

  const go = (dir) => {
    setCurrent((c) => (c + dir + count) % count);
    startTimer();
  };

  const goTo = (i) => {
    setCurrent(i);
    startTimer();
  };

  return (
    <div className="tcar" aria-label="Customer testimonials carousel">
      <button className="tcar-arrow tcar-arrow--prev" onClick={() => go(-1)} aria-label="Previous testimonial">
        <ChevronLeft size={20} />
      </button>

      <div className="tcar-stage">
        {testimonials.map((t, i) => (
          <article
            key={t.id || t.name}
            className={`testimonial-card tcar-slide${i === current ? " tcar-slide--active" : ""}`}
            aria-hidden={i !== current}
          >
            <div className="tcar-stars">
              {Array.from({ length: Math.max(1, Math.min(5, Number(t.rating) || 5)) }).map((_, si) => (
                <Star key={si} size={15} fill="currentColor" />
              ))}
            </div>
            <p className="tcar-quote">"{t.quote}"</p>
            <h3 className="tcar-name">{t.name}</h3>
            <span className="tcar-role">{t.role}</span>
          </article>
        ))}
      </div>

      <button className="tcar-arrow tcar-arrow--next" onClick={() => go(1)} aria-label="Next testimonial">
        <ChevronRight size={20} />
      </button>

      <div className="tcar-dots" role="tablist" aria-label="Testimonial navigation">
        {testimonials.map((_, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === current}
            className={`tcar-dot${i === current ? " tcar-dot--active" : ""}`}
            onClick={() => goTo(i)}
            aria-label={`Testimonial ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
