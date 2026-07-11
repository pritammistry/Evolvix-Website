import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSEO } from "../hooks/useSEO";
import { ArrowRight, BookOpen, Download, ExternalLink, Gamepad2, Music2, Pause, Play } from "lucide-react";
import { SectionHeader } from "../components/SectionHeader";
import { useSiteContent } from "../hooks/useSiteContent";
import { useAuth } from "../hooks/useAuth";
import { fetchPlayground, trackAnalyticsEvent } from "../api";

const MUSIC_MAX = 10;
const FREEBIE_MAX = 6;
const GAME_MAX = 4;

function ArtistCard({ track, index }) {
  return (
    <article className="audio-preview-card" data-testid={`playground-artist-card-${index}`}>
      <span data-testid={`playground-artist-mood-${index}`}>{track.mood}</span>
      <h3 data-testid={`playground-artist-title-${index}`}>{track.title}</h3>
      <p data-testid={`playground-artist-desc-${index}`}>{track.description}</p>
      <div className="audio-preview-links" data-testid={`playground-artist-links-${index}`}>
        <a className="audio-preview-placeholder" href={track.audio_url} target="_blank" rel="noopener noreferrer" data-testid={`playground-artist-youtube-${index}`}>
          <Play size={16} /> Open on YouTube
        </a>
        {track.secondary_url && (
          <a className="audio-preview-placeholder" href={track.secondary_url} target="_blank" rel="noopener noreferrer" data-testid={`playground-artist-secondary-${index}`}>
            <ExternalLink size={16} /> {track.secondary_label || "More"}
          </a>
        )}
      </div>
    </article>
  );
}

function makeThumbSrc(title) {
  const hue = [...title].reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0xffff, 0) % 360;
  const c1 = `hsl(${hue},70%,62%)`;
  const c2 = `hsl(${(hue + 40) % 360},65%,52%)`;
  const bg = `hsl(${hue},30%,9%)`;
  const bars = 7;
  const codes = [...title].map(c => c.charCodeAt(0));
  const barW = 3, gap = 2, totalW = bars * (barW + gap) - gap;
  const x0 = (40 - totalW) / 2;
  const rects = Array.from({ length: bars }, (_, i) => {
    const h = 8 + ((codes[i % codes.length] * (i + 5)) % 22);
    const x = x0 + i * (barW + gap);
    const y = ((40 - h) / 2).toFixed(1);
    return `<rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="1.5" fill="${i % 2 === 0 ? c1 : c2}" opacity="${(0.55 + (i % 3) * 0.15).toFixed(2)}"/>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="${bg}"/>${rects}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function MusicTrackRow({ item, index, onDownload }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);
  const fadeTimeoutRef = useRef(null);
  const fadeIntervalRef = useRef(null);
  const thumbSrc = useMemo(() => item.thumbnail || makeThumbSrc(item.title), [item.thumbnail, item.title]);

  useEffect(() => () => {
    audioRef.current?.pause();
    clearTimeout(fadeTimeoutRef.current);
    clearInterval(fadeIntervalRef.current);
  }, []);

  function stopPreview() {
    audioRef.current?.pause();
    audioRef.current = null;
    clearTimeout(fadeTimeoutRef.current);
    clearInterval(fadeIntervalRef.current);
    setPlaying(false);
  }

  function togglePreview() {
    if (!item.preview_url) return;
    if (playing) { stopPreview(); return; }

    const audio = new Audio(item.preview_url);
    audioRef.current = audio;
    audio.addEventListener('ended', stopPreview);
    audio.play().catch(() => {});
    setPlaying(true);

    // Fade: 0.25s ticks × 20 steps = 5s. Start at 10s, done at 15s.
    fadeTimeoutRef.current = setTimeout(() => {
      let step = 0;
      fadeIntervalRef.current = setInterval(() => {
        step++;
        if (audioRef.current) audioRef.current.volume = Math.max(0, 1 - step / 20);
        if (step >= 20) {
          clearInterval(fadeIntervalRef.current);
          audioRef.current?.pause();
          audioRef.current = null;
          setPlaying(false);
        }
      }, 250);
    }, 10000);
  }

  return (
    <div className={`playground-track-row${playing ? " playground-track-row--playing" : ""}`} data-testid={`playground-track-${item.id}`}>
      <span className="playground-track-num">{index + 1}</span>
      <button
        className={`playground-track-thumb-wrap${item.preview_url ? " playground-track-thumb-wrap--clickable" : ""}`}
        onClick={togglePreview}
        aria-label={playing ? "Pause preview" : "Play preview"}
        disabled={!item.preview_url}
        data-testid={`playground-track-thumb-${item.id}`}
      >
        <img src={thumbSrc} alt={item.title} className="playground-track-thumb" />
        {item.preview_url && (
          <span className="playground-track-play-overlay">
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </span>
        )}
      </button>
      <div className="playground-track-info">
        <strong data-testid={`playground-track-title-${item.id}`}>{item.title}</strong>
        {item.description && <span data-testid={`playground-track-desc-${item.id}`}>{item.description}</span>}
      </div>
      <button className="playground-track-btn" onClick={() => onDownload(item)} data-testid={`playground-track-btn-${item.id}`}>
        <Download size={14} /> Download Free
      </button>
    </div>
  );
}

function ThumbnailCard({ item, onDownload, btnLabel = "Download Free" }) {
  return (
    <article className="playground-thumb-card" data-testid={`playground-item-${item.id}`}>
      {item.thumbnail
        ? <img src={item.thumbnail} alt={item.title} className="playground-thumb-img" data-testid={`playground-item-thumb-${item.id}`} />
        : <div className="playground-thumb-placeholder" data-testid={`playground-item-placeholder-${item.id}`}>
            {item.category === "freebie" ? <BookOpen size={32} /> : <Gamepad2 size={32} />}
          </div>
      }
      <div className="playground-thumb-body">
        <h3 data-testid={`playground-item-title-${item.id}`}>{item.title}</h3>
        <p data-testid={`playground-item-desc-${item.id}`}>{item.description}</p>
        <button className="primary-btn" onClick={() => onDownload(item)} data-testid={`playground-item-btn-${item.id}`}>
          <Download size={14} /> {btnLabel}
        </button>
      </div>
    </article>
  );
}

export default function Playground() {
  useSEO({ title: "Evolvix Playground — Creative Experiments & AI Tools", description: "Explore interactive AI experiments, tools, and creative prototypes from the Evolvix product lab.", path: "/playground" });
  const { content } = useSiteContent();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);

  const musicPreviews = (content.music_previews || []).filter((p) => p.visible !== false);

  const load = useCallback(async () => {
    try {
      const { data } = await fetchPlayground();
      setItems(data.items || []);
    } catch {
      // silently fail — page still renders with artist cards
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const musicItems = items.filter((i) => i.category === "music").slice(0, MUSIC_MAX);
  const freebieItems = items.filter((i) => i.category === "freebie").slice(0, FREEBIE_MAX);
  const gameItems = items.filter((i) => i.category === "game").slice(0, GAME_MAX);

  function handleDownload(item) {
    if (!user) {
      navigate("/login?next=/playground");
      return;
    }
    trackAnalyticsEvent({ event_type: "playground_download", label: item.title, section_id: item.category, product_id: item.id }).catch(() => {});
    window.open(item.url, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="section page-section" data-testid="playground-page">
      <SectionHeader
        eyebrow="Evolvix Playground"
        title="Explore. Learn. Play."
        text="Free AI music, prompt books, and interactive experiences — open to everyone, yours to keep once you sign in."
      />

      {/* AI Music */}
      <div className="playground-block" data-testid="playground-music-section">
        <div className="playground-block-header">
          <Music2 size={22} />
          <h2>AI Music</h2>
        </div>
        <p className="playground-block-sub">Original AI-assisted music from Evolvix creators — follow the channels for new releases, or sign in to download individual tracks below.</p>

        {musicPreviews.length > 0 && (
          <div className="audio-preview-grid" data-testid="playground-artist-grid">
            {musicPreviews.map((track, i) => <ArtistCard key={track.id} track={track} index={i} />)}
          </div>
        )}

        {musicItems.length > 0 ? (
          <div className="playground-tracklist" data-testid="playground-tracklist">
            <div className="playground-tracklist-header">
              <span>Tracks available to download</span>
              <span>{musicItems.length} / {MUSIC_MAX}</span>
            </div>
            {musicItems.map((item, i) => (
              <MusicTrackRow key={item.id} item={item} index={i} onDownload={handleDownload} />
            ))}
          </div>
        ) : (
          <div className="playground-coming-soon" style={{ marginTop: 24 }} data-testid="playground-music-empty">
            <span className="playground-coming-badge">Tracks Coming Soon</span>
            <p>Downloadable music tracks are being added here — check back soon.</p>
          </div>
        )}
      </div>

      {/* Freebie Books */}
      <div className="playground-block" data-testid="playground-freebies-section">
        <div className="playground-block-header">
          <BookOpen size={22} />
          <h2>Free Prompt Books</h2>
        </div>
        <p className="playground-block-sub">
          {user ? "You're signed in — click Download Free to get your pack." : "Sign in to claim your free pack — no payment needed, just an account."}
        </p>
        {freebieItems.length > 0 ? (
          <div className="playground-thumb-grid" data-testid="playground-freebies-grid">
            {freebieItems.map((item) => <ThumbnailCard key={item.id} item={item} onDownload={handleDownload} />)}
          </div>
        ) : (
          <div className="playground-coming-soon" data-testid="playground-freebies-empty">
            <span className="playground-coming-badge">Coming Soon</span>
            <p>Free prompt books and resources are being added here — check back soon.</p>
          </div>
        )}
      </div>

      {/* Fun AI Games */}
      <div className="playground-block" data-testid="playground-games-section">
        <div className="playground-block-header">
          <Gamepad2 size={22} />
          <h2>Fun AI Games</h2>
        </div>
        {gameItems.length > 0 ? (
          <>
            <p className="playground-block-sub">
              {user ? "You're signed in — click to launch." : "Sign in to access these interactive experiences."}
            </p>
            <div className="playground-thumb-grid playground-thumb-grid--games" data-testid="playground-games-grid">
              {gameItems.map((item) => <ThumbnailCard key={item.id} item={item} onDownload={handleDownload} btnLabel="Play Now" />)}
            </div>
          </>
        ) : (
          <div className="playground-coming-soon" data-testid="playground-games-coming-soon">
            <span className="playground-coming-badge">Coming Soon</span>
            <p>Interactive AI-powered experiences are being built here. Check back soon for games, quizzes, and creative tools.</p>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="related-panel" data-testid="playground-cta-panel">
        <h2>Want something built specifically for you?</h2>
        <Link to="/shop" className="secondary-btn" data-testid="playground-shop-link">Browse Store</Link>
        <Link to="/contact" className="primary-btn" data-testid="playground-contact-cta">Talk to Us <ArrowRight size={18} /></Link>
      </div>
    </section>
  );
}
